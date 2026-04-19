package service

import (
	"fmt"
	"math"
	"time"

	"attendance-system/config"
	"attendance-system/internal/model"
)

// FraudInput holds all data needed for fraud analysis.
// Note: is_mock=true and outside-geofence are now HARD BLOCKS in attendance_service.go
// and will never reach here. These rules handle additional suspicious signals.
type FraudInput struct {
	IsMock      bool // always false here (blocked upstream)
	Accuracy    float64
	Lat         float64
	Long        float64
	DeviceTime  *time.Time
	ServerTime  time.Time
	DeviceID    string
	UserID      uint
	IsNewDevice bool
	// For speed calculation
	PrevLat       *float64
	PrevLong      *float64
	PrevCheckInAt *time.Time
}

type FraudResult struct {
	Score  int
	Status string // SAFE | SUSPICIOUS | FRAUD
	Flags  []model.FraudFlag
}

type FraudDetectionService interface {
	Analyze(input FraudInput) FraudResult
}

type fraudDetectionService struct {
	cfg *config.Config
}

func NewFraudDetectionService(cfg *config.Config) FraudDetectionService {
	return &fraudDetectionService{cfg}
}

func (s *fraudDetectionService) Analyze(input FraudInput) FraudResult {
	var totalScore int
	var flags []model.FraudFlag

	// Rule 1: Low GPS accuracy (high number = worse signal)
	// Threshold: >50m accuracy is suspicious, >150m is very suspicious
	if input.Accuracy > 150 {
		totalScore += 40
		flags = append(flags, model.FraudFlag{
			Type:        "LOW_ACCURACY",
			Score:       40,
			Description: fmt.Sprintf("Very poor GPS accuracy: ±%.0fm — possible indoor/spoofed signal", input.Accuracy),
		})
	} else if input.Accuracy > 50 {
		totalScore += 20
		flags = append(flags, model.FraudFlag{
			Type:        "LOW_ACCURACY",
			Score:       20,
			Description: fmt.Sprintf("Poor GPS accuracy: ±%.0fm (threshold: 50m)", input.Accuracy),
		})
	}

	// Rule 2: Impossible movement speed between check-ins
	if input.PrevLat != nil && input.PrevLong != nil && input.PrevCheckInAt != nil {
		speed := calculateSpeed(*input.PrevLat, *input.PrevLong, input.Lat, input.Long,
			*input.PrevCheckInAt, input.ServerTime)
		if speed > 500 {
			totalScore += 80
			flags = append(flags, model.FraudFlag{
				Type:        "HIGH_SPEED",
				Score:       80,
				Description: fmt.Sprintf("Teleportation detected: %.0f km/h between sessions (physically impossible)", speed),
			})
		} else if speed > 200 {
			totalScore += 50
			flags = append(flags, model.FraudFlag{
				Type:        "HIGH_SPEED",
				Score:       50,
				Description: fmt.Sprintf("Impossible movement speed: %.0f km/h (max realistic: 200 km/h)", speed),
			})
		}
	}

	// Rule 3: Device time vs Server time divergence
	// >2 min = suspicious (user may have manually set clock), >10 min = strong signal
	if input.DeviceTime != nil {
		diff := math.Abs(input.ServerTime.Sub(*input.DeviceTime).Minutes())
		if diff > 10 {
			totalScore += 60
			flags = append(flags, model.FraudFlag{
				Type:        "TIME_MANIPULATION",
				Score:       60,
				Description: fmt.Sprintf("Device clock is %.0f minutes off server time — likely manual time manipulation", diff),
			})
		} else if diff > 2 {
			totalScore += 30
			flags = append(flags, model.FraudFlag{
				Type:        "TIME_MANIPULATION",
				Score:       30,
				Description: fmt.Sprintf("Device time differs from server by %.1f minutes (threshold: 2 min)", diff),
			})
		}
	}

	// Rule 4: Unregistered device
	if input.IsNewDevice {
		totalScore += 20
		flags = append(flags, model.FraudFlag{
			Type:        "NEW_DEVICE",
			Score:       20,
			Description: "Attendance submitted from an unregistered device — register your device to avoid this flag",
		})
	}

	return FraudResult{
		Score:  totalScore,
		Status: statusFromScore(totalScore),
		Flags:  flags,
	}
}

func statusFromScore(score int) string {
	switch {
	case score >= 80:
		return "FRAUD"
	case score >= 40:
		return "SUSPICIOUS"
	default:
		return "SAFE"
	}
}

// haversineDistance calculates great-circle distance in meters
func haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000.0
	dLat := toRadians(lat2 - lat1)
	dLon := toRadians(lon2 - lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRadians(lat1))*math.Cos(toRadians(lat2))*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}

// calculateSpeed returns km/h between two GPS points over time
func calculateSpeed(lat1, lon1, lat2, lon2 float64, t1, t2 time.Time) float64 {
	hours := t2.Sub(t1).Hours()
	if hours <= 0 {
		return 0
	}
	return haversineDistance(lat1, lon1, lat2, lon2) / 1000 / hours
}

func toRadians(deg float64) float64 {
	return deg * math.Pi / 180
}
