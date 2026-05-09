package handler

import (
	"net/http"

	"attendance-system/internal/model"
	"attendance-system/internal/service"

	"github.com/gin-gonic/gin"
)

type BoardHandler struct {
	svc     service.BoardService
	userSvc service.UserManagementService
}

func NewBoardHandler(svc service.BoardService, userSvc service.UserManagementService) *BoardHandler {
	return &BoardHandler{svc: svc, userSvc: userSvc}
}

func (h *BoardHandler) ListWorkspaces(c *gin.Context) {
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	items, err := h.svc.ListWorkspaces(actor)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to fetch workspaces", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Workspaces fetched successfully", gin.H{"workspaces": items}, "")
}

func (h *BoardHandler) CreateWorkspace(c *gin.Context) {
	var req service.CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.CreateWorkspace(actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to create workspace", nil, err.Error())
		return
	}
	h.respond(c, http.StatusCreated, true, "Workspace created successfully", item, "")
}

func (h *BoardHandler) CreateBoard(c *gin.Context) {
	workspaceID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid workspace ID", nil, "invalid workspace ID")
		return
	}
	var req service.CreateBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.CreateBoard(workspaceID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to create board", nil, err.Error())
		return
	}
	h.respond(c, http.StatusCreated, true, "Board created successfully", item, "")
}

func (h *BoardHandler) GetBoard(c *gin.Context) {
	boardID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid board ID", nil, "invalid board ID")
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.GetBoard(boardID, actor)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to fetch board", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Board fetched successfully", item, "")
}

func (h *BoardHandler) UpdateBoard(c *gin.Context) {
	boardID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid board ID", nil, "invalid board ID")
		return
	}
	var req service.UpdateBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.UpdateBoard(boardID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to update board", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Board updated successfully", item, "")
}

func (h *BoardHandler) CreateList(c *gin.Context) {
	boardID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid board ID", nil, "invalid board ID")
		return
	}
	var req service.CreateBoardListRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.CreateList(boardID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to create list", nil, err.Error())
		return
	}
	h.respond(c, http.StatusCreated, true, "List created successfully", item, "")
}

func (h *BoardHandler) UpdateList(c *gin.Context) {
	listID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid list ID", nil, "invalid list ID")
		return
	}
	var req service.UpdateBoardListRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.UpdateList(listID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to update list", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "List updated successfully", item, "")
}

func (h *BoardHandler) CreateCard(c *gin.Context) {
	listID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid list ID", nil, "invalid list ID")
		return
	}
	var req service.CreateBoardCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.CreateCard(listID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to create card", nil, err.Error())
		return
	}
	h.respond(c, http.StatusCreated, true, "Card created successfully", item, "")
}

func (h *BoardHandler) UpdateCard(c *gin.Context) {
	cardID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid card ID", nil, "invalid card ID")
		return
	}
	var req service.UpdateBoardCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.UpdateCard(cardID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to update card", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Card updated successfully", item, "")
}

func (h *BoardHandler) MoveCard(c *gin.Context) {
	cardID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid card ID", nil, "invalid card ID")
		return
	}
	var req service.MoveBoardCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.MoveCard(cardID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to move card", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Card moved successfully", item, "")
}

func (h *BoardHandler) CreateChecklist(c *gin.Context) {
	cardID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid card ID", nil, "invalid card ID")
		return
	}
	var req service.CreateChecklistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.CreateChecklist(cardID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to create checklist", nil, err.Error())
		return
	}
	h.respond(c, http.StatusCreated, true, "Checklist created successfully", item, "")
}

func (h *BoardHandler) CreateChecklistItem(c *gin.Context) {
	checklistID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid checklist ID", nil, "invalid checklist ID")
		return
	}
	var req service.CreateChecklistItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.CreateChecklistItem(checklistID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to create checklist item", nil, err.Error())
		return
	}
	h.respond(c, http.StatusCreated, true, "Checklist item created successfully", item, "")
}

func (h *BoardHandler) ToggleChecklistItem(c *gin.Context) {
	itemID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid checklist item ID", nil, "invalid checklist item ID")
		return
	}
	var req service.ToggleChecklistItemRequest
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
			return
		}
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.ToggleChecklistItem(itemID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to update checklist item", nil, err.Error())
		return
	}
	h.respond(c, http.StatusOK, true, "Checklist item updated successfully", item, "")
}

func (h *BoardHandler) CreateComment(c *gin.Context) {
	cardID, err := parseUintParam(c, "id")
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid card ID", nil, "invalid card ID")
		return
	}
	var req service.CreateBoardCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respond(c, http.StatusBadRequest, false, "Invalid request body", nil, err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respond(c, http.StatusUnauthorized, false, "User not found", nil, "user not found")
		return
	}
	item, err := h.svc.CreateComment(cardID, actor, req)
	if err != nil {
		h.respond(c, http.StatusBadRequest, false, "Failed to create comment", nil, err.Error())
		return
	}
	h.respond(c, http.StatusCreated, true, "Comment created successfully", item, "")
}

func (h *BoardHandler) currentUser(c *gin.Context) (*model.User, error) {
	return h.userSvc.GetByID(c.GetUint("user_id"))
}

func (h *BoardHandler) respond(c *gin.Context, code int, success bool, message string, data any, errMsg string) {
	body := gin.H{"success": success, "message": message}
	if data != nil {
		body["data"] = data
	}
	if errMsg != "" {
		body["error"] = errMsg
	}
	c.JSON(code, body)
}
