package middleware

import (
	"net/http"
	"strings"
	"time"

	"attendance-system/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func JWTAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			return
		}
		token, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}
		c.Set("user_id", uint(claims["user_id"].(float64)))
		if tenantID, ok := claims["tenant_id"].(float64); ok {
			c.Set("tenant_id", uint(tenantID))
		} else {
			c.Set("tenant_id", uint(1))
		}
		c.Set("email", claims["email"])
		c.Set("role_name", claims["role_name"])
		isAdmin, _ := claims["is_system_admin"].(bool)
		c.Set("is_system_admin", isAdmin)
		if perms, ok := claims["permissions"].([]interface{}); ok {
			permNames := make([]string, 0, len(perms))
			for _, p := range perms {
				if s, ok := p.(string); ok {
					permNames = append(permNames, s)
				}
			}
			c.Set("permissions", permNames)
		}
		c.Next()
	}
}

func RequirePermission(perm string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if isAdmin, _ := c.Get("is_system_admin"); isAdmin == true {
			c.Next()
			return
		}
		perms, _ := c.Get("permissions")
		if permList, ok := perms.([]string); ok {
			for _, p := range permList {
				if p == perm {
					c.Next()
					return
				}
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error":    "Permission denied",
			"required": perm,
		})
	}
}

func RequireSystemAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		if isAdmin, _ := c.Get("is_system_admin"); isAdmin != true {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "System admin access required"})
			return
		}
		c.Next()
	}
}

func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if isAdmin, _ := c.Get("is_system_admin"); isAdmin == true {
			c.Next()
			return
		}
		perms, _ := c.Get("permissions")
		if permList, ok := perms.([]string); ok {
			for _, p := range permList {
				if p == "admin:access" {
					c.Next()
					return
				}
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
	}
}

func LoadUserPermissions(userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}
		user, err := userRepo.FindByIDWithRole(userID.(uint))
		if err != nil || !user.IsActive {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User not found or inactive"})
			return
		}
		c.Set("permissions", user.PermissionNames())
		c.Next()
	}
}

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		gin.DefaultWriter.Write([]byte(strings.Join([]string{
			time.Now().Format("2006/01/02 15:04:05"),
			"| " + http.StatusText(c.Writer.Status()),
			"| " + time.Since(start).String(),
			"| " + c.Request.Method,
			c.Request.URL.Path + "\n",
		}, " ")))
	}
}
