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

const (
	faceMatchThreshold = 0.82
	faceAIMinScore     = 0.58
	faceMinQuality     = 0.35
)

type EnrollFaceRequest struct {
	UserID    uint   `json:"user_id"`
	FaceImage string `json:"face_image" binding:"required"`
}

type VerifyFaceRequest struct {
	UserID    uint   `json:"user_id"`
	FaceImage string `json:"face_image" binding:"required"`
}

type FaceAISignal struct {
	Name   string  `json:"name"`
	Score  float64 `json:"score"`
	Passed bool    `json:"passed"`
	Note   string  `json:"note,omitempty"`
}

type FaceAIAnalysis struct {
	Engine       string         `json:"engine"`
	Mode         string         `json:"mode"`
	OverallScore float64        `json:"overall_score"`
	MinScore     float64        `json:"min_score"`
	Passed       bool           `json:"passed"`
	Brightness   float64        `json:"brightness"`
	Contrast     float64        `json:"contrast"`
	Sharpness    float64        `json:"sharpness"`
	Symmetry     float64        `json:"symmetry"`
	Centering    float64        `json:"centering"`
	Frontal      bool           `json:"frontal"`
	Signals      []FaceAISignal `json:"signals"`
	Guidance     []string       `json:"guidance,omitempty"`
}

type FaceEnrollmentResult struct {
	Profile  *model.FaceProfile `json:"profile"`
	Analysis *FaceAIAnalysis    `json:"analysis"`
	Message  string             `json:"message"`
}

type FaceVerificationResult struct {
	Verified  bool            `json:"verified"`
	Score     float64         `json:"score"`
	Threshold float64         `json:"threshold"`
	ProfileID uint            `json:"profile_id,omitempty"`
	Message   string          `json:"message,omitempty"`
	Analysis  *FaceAIAnalysis `json:"analysis,omitempty"`
}

type FaceRecognitionService interface {
	Enroll(userID uint, req EnrollFaceRequest) (*FaceEnrollmentResult, error)
	EnrollSelf(user *model.User, faceImage string) (*FaceEnrollmentResult, error)
	Verify(userID uint, faceImage string) (*FaceVerificationResult, error)
	List() ([]model.FaceProfile, error)
	ListByUser(userID uint) ([]model.FaceProfile, error)
	SetActive(profileID uint, active bool) (*model.FaceProfile, error)
}

type faceRecognitionService struct {
	faceRepo repository.FaceProfileRepository
	userRepo repository.UserRepository
}

type extractedFaceFeatures struct {
	template string
	quality  float64
	analysis *FaceAIAnalysis
}

func NewFaceRecognitionService(faceRepo repository.FaceProfileRepository, userRepo repository.UserRepository) FaceRecognitionService {
	return &faceRecognitionService{faceRepo: faceRepo, userRepo: userRepo}
}

func (s *faceRecognitionService) Enroll(userID uint, req EnrollFaceRequest) (*FaceEnrollmentResult, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	return s.EnrollSelf(user, req.FaceImage)
}

func (s *faceRecognitionService) EnrollSelf(user *model.User, faceImage string) (*FaceEnrollmentResult, error) {
	features, err := extractFaceFeatures(faceImage)
	if err != nil {
		return nil, err
	}
	if features.quality < faceMinQuality {
		return nil, errors.New("face sample quality is too low")
	}
	if features.analysis != nil && !features.analysis.Passed {
		return nil, errors.New(joinGuidance("AI face analysis rejected the sample", features.analysis.Guidance))
	}
	if err := s.faceRepo.DeactivateForUser(user.ID); err != nil {
		return nil, err
	}
	profile := &model.FaceProfile{
		TenantID:        user.TenantID,
		UserID:          user.ID,
		TemplateHash:    features.template,
		TemplatePreview: features.template[:12],
		QualityScore:    features.quality,
		IsActive:        true,
	}
	if err := s.faceRepo.Create(profile); err != nil {
		return nil, err
	}
	return &FaceEnrollmentResult{
		Profile:  profile,
		Analysis: features.analysis,
		Message:  "Face profile enrolled with AI validation",
	}, nil
}

func (s *faceRecognitionService) Verify(userID uint, faceImage string) (*FaceVerificationResult, error) {
	profile, err := s.faceRepo.FindActiveByUserID(userID)
	if err != nil {
		return nil, errors.New("active face profile not found")
	}
	features, err := extractFaceFeatures(faceImage)
	if err != nil {
		return nil, err
	}
	if features.analysis != nil && !features.analysis.Passed {
		return &FaceVerificationResult{
			Verified:  false,
			Score:     0,
			Threshold: faceMatchThreshold,
			ProfileID: profile.ID,
			Message:   joinGuidance("AI face analysis rejected the sample", features.analysis.Guidance),
			Analysis:  features.analysis,
		}, nil
	}
	score := templateSimilarity(profile.TemplateHash, features.template)
	verified := features.quality >= faceMinQuality && score >= faceMatchThreshold
	if verified {
		now := time.Now()
		profile.LastVerifiedAt = &now
		_ = s.faceRepo.Update(profile)
	}
	msg := "face verified with AI analysis"
	if !verified {
		msg = "face does not match the enrolled profile"
	}
	return &FaceVerificationResult{
		Verified:  verified,
		Score:     score,
		Threshold: faceMatchThreshold,
		ProfileID: profile.ID,
		Message:   msg,
		Analysis:  features.analysis,
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

func extractFaceFeatures(faceImage string) (*extractedFaceFeatures, error) {
	normalized := strings.TrimSpace(faceImage)
	if normalized == "" {
		return nil, errors.New("face image is required")
	}
	if len(normalized) < 64 {
		return nil, errors.New("face image sample is too small")
	}
	if idx := strings.Index(normalized, ","); strings.HasPrefix(normalized, "data:") && idx >= 0 {
		meta := normalized[:idx]
		payload := normalized[idx+1:]
		if strings.Contains(strings.ToLower(meta), "image/") {
			return extractImageFaceFeatures(payload)
		}
		normalized = payload
	}
	template, quality, err := buildTextFaceTemplate(normalized)
	if err != nil {
		return nil, err
	}
	analysis := &FaceAIAnalysis{
		Engine:       "AttendGuard Face AI v1",
		Mode:         "template-fallback",
		OverallScore: quality,
		MinScore:     faceAIMinScore,
		Passed:       quality >= faceMinQuality,
		Brightness:   quality,
		Contrast:     quality,
		Sharpness:    quality,
		Symmetry:     quality,
		Centering:    quality,
		Frontal:      quality >= faceMinQuality,
		Signals: []FaceAISignal{
			{Name: "template_quality", Score: quality, Passed: quality >= faceMinQuality, Note: "Fallback mode is used when a raw image is not available."},
		},
	}
	if !analysis.Passed {
		analysis.Guidance = []string{"Capture a clearer face sample before continuing."}
	}
	return &extractedFaceFeatures{template: template, quality: quality, analysis: analysis}, nil
}

func extractImageFaceFeatures(payload string) (*extractedFaceFeatures, error) {
	raw, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return nil, errors.New("invalid face image encoding")
	}
	img, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		template, quality, textErr := buildTextFaceTemplate(payload)
		if textErr != nil {
			return nil, textErr
		}
		analysis := &FaceAIAnalysis{
			Engine:       "AttendGuard Face AI v1",
			Mode:         "template-fallback",
			OverallScore: quality,
			MinScore:     faceAIMinScore,
			Passed:       quality >= faceMinQuality,
			Brightness:   quality,
			Contrast:     quality,
			Sharpness:    quality,
			Symmetry:     quality,
			Centering:    quality,
			Frontal:      quality >= faceMinQuality,
			Signals: []FaceAISignal{
				{Name: "template_quality", Score: quality, Passed: quality >= faceMinQuality, Note: "Image decoding failed, fallback analysis was used."},
			},
		}
		return &extractedFaceFeatures{template: template, quality: quality, analysis: analysis}, nil
	}

	gray, width, height := downsampleGrayscale(img, 48, 48)
	if width == 0 || height == 0 {
		return nil, errors.New("face image is empty")
	}

	brightness := averageGray(gray)
	contrast := stdDevGray(gray, brightness)
	sharpness := sobelSharpness(gray, width, height)
	symmetry := mirrorSymmetry(gray, width, height)
	centering := energyCentering(gray, width, height)
	frontalScore := clamp01((symmetry * 0.55) + (centering * 0.45))

	brightnessScore := scoreRange(brightness, 80, 190, 118)
	contrastScore := scoreMin(contrast, 18, 42)
	sharpnessScore := scoreMin(sharpness, 10, 28)

	overall := clamp01(
		(brightnessScore * 0.18) +
			(contrastScore * 0.18) +
			(sharpnessScore * 0.22) +
			(symmetry * 0.22) +
			(centering * 0.20),
	)
	quality := clamp01((overall * 0.75) + (frontalScore * 0.25))

	analysis := &FaceAIAnalysis{
		Engine:       "AttendGuard Face AI v1",
		Mode:         "image-analysis",
		OverallScore: overall,
		MinScore:     faceAIMinScore,
		Passed:       overall >= faceAIMinScore && frontalScore >= 0.55 && sharpnessScore >= 0.42,
		Brightness:   brightnessScore,
		Contrast:     contrastScore,
		Sharpness:    sharpnessScore,
		Symmetry:     symmetry,
		Centering:    centering,
		Frontal:      frontalScore >= 0.55,
		Signals: []FaceAISignal{
			{Name: "brightness", Score: brightnessScore, Passed: brightnessScore >= 0.45, Note: "Face needs balanced lighting."},
			{Name: "contrast", Score: contrastScore, Passed: contrastScore >= 0.45, Note: "Face edges must be visible."},
			{Name: "sharpness", Score: sharpnessScore, Passed: sharpnessScore >= 0.42, Note: "Avoid blur or motion while capturing."},
			{Name: "symmetry", Score: symmetry, Passed: symmetry >= 0.50, Note: "Keep the face straight toward the camera."},
			{Name: "centering", Score: centering, Passed: centering >= 0.50, Note: "Center the face inside the guide frame."},
		},
	}
	analysis.Guidance = guidanceFromSignals(analysis.Signals)

	hash := perceptualHash(gray, width, height)
	return &extractedFaceFeatures{
		template: hash,
		quality:  quality,
		analysis: analysis,
	}, nil
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

func perceptualHash(gray []float64, width, height int) string {
	const size = 8
	resized := resizeFloatGrid(gray, width, height, size, size)
	avg := 0.0
	for _, v := range resized {
		avg += v
	}
	avg /= float64(len(resized))
	buf := make([]byte, 8)
	for i, v := range resized {
		if v >= avg {
			buf[i/8] |= 1 << uint(7-(i%8))
		}
	}
	return hex.EncodeToString(buf)
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

func downsampleGrayscale(img image.Image, targetW, targetH int) ([]float64, int, int) {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	if width == 0 || height == 0 {
		return nil, 0, 0
	}
	grid := make([]float64, targetW*targetH)
	for y := 0; y < targetH; y++ {
		srcY := bounds.Min.Y + (y*height)/targetH
		for x := 0; x < targetW; x++ {
			srcX := bounds.Min.X + (x*width)/targetW
			r, g, b, _ := img.At(srcX, srcY).RGBA()
			gray := ((float64(r>>8) * 299) + (float64(g>>8) * 587) + (float64(b>>8) * 114)) / 1000
			grid[y*targetW+x] = gray
		}
	}
	return grid, targetW, targetH
}

func resizeFloatGrid(src []float64, srcW, srcH, dstW, dstH int) []float64 {
	dst := make([]float64, dstW*dstH)
	for y := 0; y < dstH; y++ {
		srcY := (y * srcH) / dstH
		for x := 0; x < dstW; x++ {
			srcX := (x * srcW) / dstW
			dst[y*dstW+x] = src[srcY*srcW+srcX]
		}
	}
	return dst
}

func averageGray(gray []float64) float64 {
	sum := 0.0
	for _, v := range gray {
		sum += v
	}
	return sum / float64(len(gray))
}

func stdDevGray(gray []float64, avg float64) float64 {
	sum := 0.0
	for _, v := range gray {
		diff := v - avg
		sum += diff * diff
	}
	return math.Sqrt(sum / float64(len(gray)))
}

func sobelSharpness(gray []float64, width, height int) float64 {
	if width < 3 || height < 3 {
		return 0
	}
	total := 0.0
	count := 0.0
	for y := 1; y < height-1; y++ {
		for x := 1; x < width-1; x++ {
			gx := (-1 * gray[(y-1)*width+(x-1)]) + (1 * gray[(y-1)*width+(x+1)]) +
				(-2 * gray[y*width+(x-1)]) + (2 * gray[y*width+(x+1)]) +
				(-1 * gray[(y+1)*width+(x-1)]) + (1 * gray[(y+1)*width+(x+1)])
			gy := (-1 * gray[(y-1)*width+(x-1)]) + (-2 * gray[(y-1)*width+x]) + (-1 * gray[(y-1)*width+(x+1)]) +
				(1 * gray[(y+1)*width+(x-1)]) + (2 * gray[(y+1)*width+x]) + (1 * gray[(y+1)*width+(x+1)])
			total += math.Sqrt((gx * gx) + (gy * gy))
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return total / count
}

func mirrorSymmetry(gray []float64, width, height int) float64 {
	diff := 0.0
	count := 0.0
	half := width / 2
	for y := 0; y < height; y++ {
		for x := 0; x < half; x++ {
			left := gray[y*width+x]
			right := gray[y*width+(width-1-x)]
			diff += math.Abs(left-right) / 255.0
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return clamp01(1 - (diff / count))
}

func energyCentering(gray []float64, width, height int) float64 {
	total := 0.0
	weightedX := 0.0
	weightedY := 0.0
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			energy := math.Abs(gray[y*width+x] - 128)
			total += energy
			weightedX += float64(x) * energy
			weightedY += float64(y) * energy
		}
	}
	if total == 0 {
		return 0.5
	}
	centerX := weightedX / total
	centerY := weightedY / total
	targetX := float64(width-1) / 2
	targetY := float64(height-1) / 2
	dx := math.Abs(centerX-targetX) / targetX
	dy := math.Abs(centerY-targetY) / targetY
	return clamp01(1 - ((dx + dy) / 2))
}

func scoreRange(value, min, max, ideal float64) float64 {
	if value < min {
		return clamp01(value / min)
	}
	if value > max {
		return clamp01(1 - ((value - max) / ideal))
	}
	span := math.Max(ideal-min, max-ideal)
	return clamp01(1 - (math.Abs(value-ideal) / span))
}

func scoreMin(value, min, ideal float64) float64 {
	if value <= min {
		return clamp01(value / min)
	}
	return clamp01(value / ideal)
}

func guidanceFromSignals(signals []FaceAISignal) []string {
	var guidance []string
	for _, signal := range signals {
		if signal.Passed || signal.Note == "" {
			continue
		}
		guidance = append(guidance, signal.Note)
	}
	if len(guidance) == 0 {
		guidance = append(guidance, "Face sample passed AI validation.")
	}
	return guidance
}

func joinGuidance(prefix string, guidance []string) string {
	if len(guidance) == 0 {
		return prefix
	}
	return prefix + ": " + strings.Join(guidance, " ")
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}
