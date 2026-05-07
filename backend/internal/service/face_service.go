package service

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"math"
	"math/bits"
	"strings"
	"time"

	"attendance-system/internal/model"
	"attendance-system/internal/repository"
)

const faceMatchThreshold = 0.82

type EnrollFaceRequest struct {
	UserID    uint   `json:"user_id"`
	FaceImage string `json:"face_image" binding:"required"`
}

type VerifyFaceRequest struct {
	UserID    uint   `json:"user_id"`
	FaceImage string `json:"face_image" binding:"required"`
}

type FaceVerificationResult struct {
	Verified  bool    `json:"verified"`
	Score     float64 `json:"score"`
	Threshold float64 `json:"threshold"`
	ProfileID uint    `json:"profile_id,omitempty"`
	Message   string  `json:"message,omitempty"`
}

type FaceRecognitionService interface {
	Enroll(userID uint, req EnrollFaceRequest) (*model.FaceProfile, error)
	EnrollSelf(user *model.User, faceImage string) (*model.FaceProfile, error)
	Verify(userID uint, faceImage string) (*FaceVerificationResult, error)
	List() ([]model.FaceProfile, error)
	ListByUser(userID uint) ([]model.FaceProfile, error)
	SetActive(profileID uint, active bool) (*model.FaceProfile, error)
}

type faceRecognitionService struct {
	faceRepo repository.FaceProfileRepository
	userRepo repository.UserRepository
}

func NewFaceRecognitionService(faceRepo repository.FaceProfileRepository, userRepo repository.UserRepository) FaceRecognitionService {
	return &faceRecognitionService{faceRepo: faceRepo, userRepo: userRepo}
}

func (s *faceRecognitionService) Enroll(userID uint, req EnrollFaceRequest) (*model.FaceProfile, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	return s.EnrollSelf(user, req.FaceImage)
}

func (s *faceRecognitionService) EnrollSelf(user *model.User, faceImage string) (*model.FaceProfile, error) {
	template, quality, err := buildFaceTemplate(faceImage)
	if err != nil {
		return nil, err
	}
	if quality < 0.35 {
		return nil, errors.New("face sample quality is too low")
	}
	if err := s.faceRepo.DeactivateForUser(user.ID); err != nil {
		return nil, err
	}
	profile := &model.FaceProfile{
		TenantID:        user.TenantID,
		UserID:          user.ID,
		TemplateHash:    template,
		TemplatePreview: template[:12],
		QualityScore:    quality,
		IsActive:        true,
	}
	return profile, s.faceRepo.Create(profile)
}

func (s *faceRecognitionService) Verify(userID uint, faceImage string) (*FaceVerificationResult, error) {
	profile, err := s.faceRepo.FindActiveByUserID(userID)
	if err != nil {
		return nil, errors.New("active face profile not found")
	}
	template, quality, err := buildFaceTemplate(faceImage)
	if err != nil {
		return nil, err
	}
	score := templateSimilarity(profile.TemplateHash, template)
	verified := quality >= 0.35 && score >= faceMatchThreshold
	if verified {
		now := time.Now()
		profile.LastVerifiedAt = &now
		_ = s.faceRepo.Update(profile)
	}
	msg := "face verified"
	if !verified {
		msg = "face does not match the enrolled profile"
	}
	return &FaceVerificationResult{
		Verified:  verified,
		Score:     score,
		Threshold: faceMatchThreshold,
		ProfileID: profile.ID,
		Message:   msg,
	}, nil
}

func (s *faceRecognitionService) List() ([]model.FaceProfile, error) {
	return s.faceRepo.FindAll()
}

func (s *faceRecognitionService) ListByUser(userID uint) ([]model.FaceProfile, error) {
	return s.faceRepo.FindByUserID(userID)
}

func (s *faceRecognitionService) SetActive(profileID uint, active bool) (*model.FaceProfile, error) {
	profile, err := s.faceRepo.FindByID(profileID)
	if err != nil {
		return nil, errors.New("face profile not found")
	}
	if active {
		if err := s.faceRepo.DeactivateForUser(profile.UserID); err != nil {
			return nil, err
		}
	}
	profile.IsActive = active
	if err := s.faceRepo.Update(profile); err != nil {
		return nil, err
	}
	return s.faceRepo.FindByID(profile.ID)
}

func buildFaceTemplate(faceImage string) (string, float64, error) {
	normalized := strings.TrimSpace(faceImage)
	if normalized == "" {
		return "", 0, errors.New("face image is required")
	}
	if len(normalized) < 64 {
		return "", 0, errors.New("face image sample is too small")
	}
	if idx := strings.Index(normalized, ","); strings.HasPrefix(normalized, "data:") && idx >= 0 {
		meta := normalized[:idx]
		payload := normalized[idx+1:]
		if strings.Contains(strings.ToLower(meta), "image/") {
			return buildImageFaceTemplate(payload)
		}
		normalized = payload
	}

	const bucket = 256
	chunks := make([]byte, 0, len(normalized)/bucket+1)
	for i := 0; i < len(normalized); i += bucket {
		end := i + bucket
		if end > len(normalized) {
			end = len(normalized)
		}
		var sum int
		for _, b := range []byte(normalized[i:end]) {
			sum += int(b)
		}
		chunks = append(chunks, byte(sum%251))
	}
	hash := sha256.Sum256(chunks)
	quality := math.Min(1, float64(len(normalized))/6000)
	return hex.EncodeToString(hash[:]), quality, nil
}

func templateSimilarity(a, b string) float64 {
	if a == "" || b == "" {
		return 0
	}
	if a == b {
		return 1
	}
	if len(a) == 16 && len(b) == 16 {
		left, errA := hex.DecodeString(a)
		right, errB := hex.DecodeString(b)
		if errA == nil && errB == nil && len(left) == len(right) {
			var diff int
			for i := range left {
				diff += bits.OnesCount8(left[i] ^ right[i])
			}
			totalBits := len(left) * 8
			return 1 - (float64(diff) / float64(totalBits))
		}
	}
	minLen := len(a)
	if len(b) < minLen {
		minLen = len(b)
	}
	matches := 0
	for i := 0; i < minLen; i++ {
		if a[i] == b[i] {
			matches++
		}
	}
	return float64(matches) / float64(len(a))
}

func buildImageFaceTemplate(payload string) (string, float64, error) {
	raw, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return "", 0, errors.New("invalid face image encoding")
	}
	img, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return buildTextFaceTemplate(payload)
	}

	const size = 8
	var grayscale [size * size]uint8
	var total uint64
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	if width == 0 || height == 0 {
		return "", 0, errors.New("face image is empty")
	}

	for y := 0; y < size; y++ {
		srcY := bounds.Min.Y + (y*height)/size
		for x := 0; x < size; x++ {
			srcX := bounds.Min.X + (x*width)/size
			r, g, b, _ := img.At(srcX, srcY).RGBA()
			gray := uint8((((r >> 8) * 299) + ((g >> 8) * 587) + ((b >> 8) * 114)) / 1000)
			grayscale[y*size+x] = gray
			total += uint64(gray)
		}
	}

	avg := uint8(total / uint64(size*size))
	buf := make([]byte, 8)
	for i, gray := range grayscale {
		if gray >= avg {
			buf[i/8] |= 1 << uint(7-(i%8))
		}
	}

	var variance float64
	for _, gray := range grayscale {
		diff := float64(gray) - float64(avg)
		variance += diff * diff
	}
	variance /= float64(size * size)
	quality := math.Min(1, (float64(len(raw))/6000)+(variance/5000))

	return hex.EncodeToString(buf), quality, nil
}

func buildTextFaceTemplate(sample string) (string, float64, error) {
	const bucket = 256
	chunks := make([]byte, 0, len(sample)/bucket+1)
	for i := 0; i < len(sample); i += bucket {
		end := i + bucket
		if end > len(sample) {
			end = len(sample)
		}
		var sum int
		for _, b := range []byte(sample[i:end]) {
			sum += int(b)
		}
		chunks = append(chunks, byte(sum%251))
	}
	hash := sha256.Sum256(chunks)
	quality := math.Min(1, float64(len(sample))/6000)
	return hex.EncodeToString(hash[:]), quality, nil
}
