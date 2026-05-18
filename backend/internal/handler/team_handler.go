package handler

import (
	"net/http"

	"attendance-system/internal/model"
	"attendance-system/internal/service"

	"github.com/gin-gonic/gin"
)

type TeamHandler struct {
	svc     service.TeamService
	userSvc service.UserManagementService
}

func NewTeamHandler(svc service.TeamService, userSvc service.UserManagementService) *TeamHandler {
	return &TeamHandler{svc: svc, userSvc: userSvc}
}

func (h *TeamHandler) List(c *gin.Context) {
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	items, err := h.svc.ListTeams(actor)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to fetch teams", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Teams fetched successfully", gin.H{"teams": items}, "")
}

func (h *TeamHandler) Create(c *gin.Context) {
	var req service.CreateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.CreateTeam(actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to create team", nil, err.Error())
		return
	}
	h.respond(c, http.StatusCreated, true, "Team created successfully", item, "")
}

func (h *TeamHandler) Get(c *gin.Context) {
	teamID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid team ID", nil, "invalid team ID")
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.GetTeam(teamID, actor)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to fetch team", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Team fetched successfully", item, "")
}

func (h *TeamHandler) Update(c *gin.Context) {
	teamID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid team ID", nil, "invalid team ID")
		return
	}
	var req service.UpdateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.UpdateTeam(teamID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to update team", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Team updated successfully", item, "")
}

func (h *TeamHandler) Delete(c *gin.Context) {
	teamID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid team ID", nil, "invalid team ID")
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	if err := h.svc.DeleteTeam(teamID, actor); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to delete team", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Team deleted successfully", gin.H{"deleted": true}, "")
}

func (h *TeamHandler) ListMembers(c *gin.Context) {
	teamID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid team ID", nil, "invalid team ID")
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	items, err := h.svc.ListMembers(teamID, actor)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to fetch team members", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Team members fetched successfully", gin.H{"members": items}, "")
}

func (h *TeamHandler) InviteMember(c *gin.Context) {
	teamID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid team ID", nil, "invalid team ID")
		return
	}
	var req service.InviteTeamMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.InviteMember(teamID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to invite member", nil, err.Error())
		return
	}
	h.respond(c, http.StatusCreated, true, "Team member invited successfully", item, "")
}

func (h *TeamHandler) RemoveMember(c *gin.Context) {
	teamID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid team ID", nil, "invalid team ID")
		return
	}
	memberID, err := parseUintParam(c, "memberId")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid team member ID", nil, "invalid team member ID")
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	if err := h.svc.RemoveMember(teamID, memberID, actor); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to remove member", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Team member removed successfully", gin.H{"deleted": true}, "")
}

func (h *TeamHandler) UpdateMemberRole(c *gin.Context) {
	teamID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid team ID", nil, "invalid team ID")
		return
	}
	memberID, err := parseUintParam(c, "memberId")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid team member ID", nil, "invalid team member ID")
		return
	}
	var req service.UpdateTeamMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.UpdateMemberRole(teamID, memberID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to update member role", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Team member role updated successfully", item, "")
}

func (h *TeamHandler) CreateWorkspace(c *gin.Context) {
	teamID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid team ID", nil, "invalid team ID")
		return
	}
	var req service.CreateTeamWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.CreateWorkspace(teamID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to create workspace", nil, err.Error())
		return
	}
	h.respond(c, http.StatusCreated, true, "Workspace created successfully", item, "")
}

func (h *TeamHandler) ListWorkspaces(c *gin.Context) {
	teamID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid team ID", nil, "invalid team ID")
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	items, err := h.svc.ListWorkspaces(teamID, actor)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to fetch team workspaces", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Team workspaces fetched successfully", gin.H{"workspaces": items}, "")
}

func (h *TeamHandler) currentUser(c *gin.Context) (*model.User, error) {
	return h.userSvc.GetByID(c.GetUint("user_id"))
}

func (h *TeamHandler) respond(c *gin.Context, code int, success bool, message string, data any, errMsg string) {
	body := gin.H{"success": success, "message": message}
	if data != nil {
		body["data"] = data
	}
	if errMsg != "" {
		body["error"] = errMsg
	}
	c.JSON(code, body)
}
