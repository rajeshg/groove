/**
 * Zod Validation Tests
 *
 * Tests for all Zod schemas used in the application:
 * - Authentication (login, signup)
 * - Board operations
 * - Item/Card operations
 * - Column operations
 * - Comment operations
 * - Invitation operations
 * - Assignee operations
 */

import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  updateBoardSchema,
  createItemSchema,
  updateItemSchema,
  moveItemSchema,
  deleteCardSchema,
  createColumnSchema,
  updateColumnSchema,
  moveColumnSchema,
  deleteColumnSchema,
  createVirtualAssigneeSchema,
  createAndAssignVirtualAssigneeSchema,
  updateItemAssigneeSchema,
  inviteUserSchema,
  acceptInvitationSchema,
  declineInvitationSchema,
} from "./validation";

// ============================================================================
// Authentication Validation Tests
// ============================================================================

describe("Validation: Authentication", () => {
  describe("loginSchema", () => {
    it("should validate correct login data", () => {
      const data = {
        email: "user@example.com",
        password: "password123",
      };
      expect(() => loginSchema.parse(data)).not.toThrow();
    });

    it("should reject missing email", () => {
      const data = { password: "password123" };
      expect(() => loginSchema.parse(data)).toThrow();
    });

    it("should reject invalid email format", () => {
      const data = {
        email: "not-an-email",
        password: "password123",
      };
      expect(() => loginSchema.parse(data)).toThrow();
    });

    it("should reject missing password", () => {
      const data = { email: "user@example.com" };
      expect(() => loginSchema.parse(data)).toThrow();
    });

    it("should reject password shorter than 6 characters", () => {
      const data = {
        email: "user@example.com",
        password: "pass",
      };
      expect(() => loginSchema.parse(data)).toThrow();
    });
  });

  describe("signupSchema", () => {
    it("should validate correct signup data", () => {
      const data = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "Password@123",
      };
      expect(() => signupSchema.parse(data)).not.toThrow();
    });

    it("should reject missing firstName", () => {
      const data = {
        lastName: "Doe",
        email: "john@example.com",
        password: "Password@123",
      };
      expect(() => signupSchema.parse(data)).toThrow();
    });

    it("should reject firstName longer than 50 characters", () => {
      const data = {
        firstName: "a".repeat(51),
        lastName: "Doe",
        email: "john@example.com",
        password: "Password@123",
      };
      expect(() => signupSchema.parse(data)).toThrow();
    });

    it("should reject lastName longer than 50 characters", () => {
      const data = {
        firstName: "John",
        lastName: "a".repeat(51),
        email: "john@example.com",
        password: "Password@123",
      };
      expect(() => signupSchema.parse(data)).toThrow();
    });

    it("should reject password shorter than 8 characters", () => {
      const data = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "Pass@12",
      };
      expect(() => signupSchema.parse(data)).toThrow();
    });

    it("should reject password without special character", () => {
      const data = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "Password123",
      };
      expect(() => signupSchema.parse(data)).toThrow();
    });

    it("should accept password with various special characters", () => {
      const specialChars = ["!", "@", "#", "$", "%", "^", "&", "*"];
      specialChars.forEach((char) => {
        const data = {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          password: `Password${char}123`,
        };
        expect(() => signupSchema.parse(data)).not.toThrow();
      });
    });
  });
});

// ============================================================================
// Board Operation Validation Tests
// ============================================================================

describe("Validation: Board Operations", () => {
  describe("updateBoardSchema", () => {
    it("should validate correct board update", () => {
      const data = {
        intent: "updateBoard",
        boardId: "board-123",
        name: "New Board Name",
        color: "#ff0000",
      };
      expect(() => updateBoardSchema.parse(data)).not.toThrow();
    });

    it("should allow updating only name", () => {
      const data = {
        intent: "updateBoard",
        boardId: "board-123",
        name: "New Board Name",
      };
      expect(() => updateBoardSchema.parse(data)).not.toThrow();
    });

    it("should allow updating only color", () => {
      const data = {
        intent: "updateBoard",
        boardId: "board-123",
        color: "#00ff00",
      };
      expect(() => updateBoardSchema.parse(data)).not.toThrow();
    });

    it("should reject missing boardId", () => {
      const data = { intent: "updateBoard", name: "Name" };
      expect(() => updateBoardSchema.parse(data)).toThrow();
    });

    it("should reject invalid color format", () => {
      const data = {
        intent: "updateBoard",
        boardId: "board-123",
        color: "invalid-color",
      };
      expect(() => updateBoardSchema.parse(data)).toThrow();
    });

    it("should reject wrong intent", () => {
      const data = {
        intent: "wrongIntent",
        boardId: "board-123",
      };
      expect(() => updateBoardSchema.parse(data)).toThrow();
    });
  });
});

// ============================================================================
// Item/Card Operation Validation Tests
// ============================================================================

describe("Validation: Item/Card Operations", () => {
  describe("createItemSchema", () => {
    it("should validate correct item creation", () => {
      const data = {
        intent: "createItem",
        id: "temp-abc123",
        columnId: "col-123",
        title: "New Card",
        order: 1,
        content: "Card content",
      };
      expect(() => createItemSchema.parse(data)).not.toThrow();
    });

    it("should validate item with null content", () => {
      const data = {
        intent: "createItem",
        id: "temp-abc123",
        columnId: "col-123",
        title: "New Card",
        order: 1,
        content: null,
      };
      expect(() => createItemSchema.parse(data)).not.toThrow();
    });

    it("should reject missing title", () => {
      const data = {
        intent: "createItem",
        id: "temp-abc123",
        columnId: "col-123",
        order: 1,
      };
      expect(() => createItemSchema.parse(data)).toThrow();
    });

    it("should reject empty title", () => {
      const data = {
        intent: "createItem",
        id: "temp-abc123",
        columnId: "col-123",
        title: "",
        order: 1,
      };
      expect(() => createItemSchema.parse(data)).toThrow();
    });

    it("should reject title longer than 255 characters", () => {
      const data = {
        intent: "createItem",
        id: "temp-abc123",
        columnId: "col-123",
        title: "a".repeat(256),
        order: 1,
      };
      expect(() => createItemSchema.parse(data)).toThrow();
    });

    it("should reject non-numeric order", () => {
      const data = {
        intent: "createItem",
        id: "temp-abc123",
        columnId: "col-123",
        title: "Card",
        order: "not-a-number",
      };
      expect(() => createItemSchema.parse(data)).toThrow();
    });

    it("should coerce string order to number", () => {
      const data = {
        intent: "createItem",
        id: "temp-abc123",
        columnId: "col-123",
        title: "Card",
        order: "42",
      };
      const result = createItemSchema.parse(data);
      expect(result.order).toBe(42);
    });
  });

  describe("updateItemSchema", () => {
    it("should validate correct item update", () => {
      const data = {
        intent: "updateItem",
        id: "item-123",
        columnId: "col-123",
        title: "Updated Card",
        order: 2,
        content: "Updated content",
      };
      expect(() => updateItemSchema.parse(data)).not.toThrow();
    });
  });

  describe("moveItemSchema", () => {
    it("should validate correct item move", () => {
      const data = {
        intent: "moveItem",
        id: "item-123",
        columnId: "col-456",
        order: 3,
      };
      expect(() => moveItemSchema.parse(data)).not.toThrow();
    });

    it("should allow optional title in move", () => {
      const data = {
        intent: "moveItem",
        id: "item-123",
        columnId: "col-456",
        title: "Updated title",
        order: 3,
      };
      expect(() => moveItemSchema.parse(data)).not.toThrow();
    });
  });

  describe("deleteCardSchema", () => {
    it("should validate correct card delete", () => {
      const data = {
        intent: "deleteCard",
        itemId: "item-123",
      };
      expect(() => deleteCardSchema.parse(data)).not.toThrow();
    });

    it("should reject missing itemId", () => {
      const data = { intent: "deleteCard" };
      expect(() => deleteCardSchema.parse(data)).toThrow();
    });
  });
});

// ============================================================================
// Column Operation Validation Tests
// ============================================================================

describe("Validation: Column Operations", () => {
  describe("createColumnSchema", () => {
    it("should validate correct column creation", () => {
      const data = {
        boardId: "board123",
        name: "To Do",
        id: "temp-col123",
      };
      expect(() => createColumnSchema.parse(data)).not.toThrow();
    });

    it("should validate column creation without id (server generates)", () => {
      const data = {
        boardId: "board123",
        name: "To Do",
      };
      expect(() => createColumnSchema.parse(data)).not.toThrow();
    });

    it("should reject missing name", () => {
      const data = {
        boardId: "board123",
        id: "temp-col123",
      };
      expect(() => createColumnSchema.parse(data)).toThrow();
    });

    it("should reject missing boardId", () => {
      const data = {
        name: "To Do",
        id: "temp-col123",
      };
      expect(() => createColumnSchema.parse(data)).toThrow();
    });

    it("should reject name longer than 255 characters", () => {
      const data = {
        boardId: "board123",
        name: "a".repeat(256),
        id: "temp-col123",
      };
      expect(() => createColumnSchema.parse(data)).toThrow();
    });
  });

  describe("updateColumnSchema", () => {
    it("should validate correct column update with name", () => {
      const data = {
        intent: "updateColumn",
        columnId: "col-123",
        name: "Updated Name",
      };
      expect(() => updateColumnSchema.parse(data)).not.toThrow();
    });

    it("should validate correct column update with color", () => {
      const data = {
        intent: "updateColumn",
        columnId: "col-123",
        color: "#ff0000",
      };
      expect(() => updateColumnSchema.parse(data)).not.toThrow();
    });

    it("should validate correct column update with isExpanded", () => {
      const data = {
        intent: "updateColumn",
        columnId: "col-123",
        isExpanded: "1",
      };
      expect(() => updateColumnSchema.parse(data)).not.toThrow();
    });

    it("should reject invalid color format", () => {
      const data = {
        intent: "updateColumn",
        columnId: "col-123",
        color: "not-a-hex-color",
      };
      expect(() => updateColumnSchema.parse(data)).toThrow();
    });

    it("should accept valid hex colors", () => {
      const validColors = ["#000000", "#FFFFFF", "#ff00FF", "#abcdef"];
      validColors.forEach((color) => {
        const data = {
          intent: "updateColumn",
          columnId: "col-123",
          color,
        };
        expect(() => updateColumnSchema.parse(data)).not.toThrow();
      });
    });
  });

  describe("moveColumnSchema", () => {
    it("should validate correct column move", () => {
      const data = {
        intent: "moveColumn",
        id: "col-123",
        order: 2,
      };
      expect(() => moveColumnSchema.parse(data)).not.toThrow();
    });
  });

  describe("deleteColumnSchema", () => {
    it("should validate correct column delete", () => {
      const data = {
        intent: "deleteColumn",
        columnId: "col-123",
      };
      expect(() => deleteColumnSchema.parse(data)).not.toThrow();
    });
  });
});

// ============================================================================
// Assignee Operation Validation Tests
// ============================================================================

describe("Validation: Assignee Operations", () => {
  describe("createVirtualAssigneeSchema", () => {
    it("should validate correct virtual assignee creation", () => {
      const data = {
        intent: "createVirtualAssignee",
        name: "John Doe",
      };
      expect(() => createVirtualAssigneeSchema.parse(data)).not.toThrow();
    });

    it("should reject missing name", () => {
      const data = { intent: "createVirtualAssignee" };
      expect(() => createVirtualAssigneeSchema.parse(data)).toThrow();
    });

    it("should accept assignee name at max length", () => {
      // Max: 50 + 50 + 1 (space) + 9 (buffer) = 110
      const data = {
        intent: "createVirtualAssignee",
        name: "a".repeat(110),
      };
      expect(() => createVirtualAssigneeSchema.parse(data)).not.toThrow();
    });

    it("should reject assignee name exceeding max length", () => {
      const data = {
        intent: "createVirtualAssignee",
        name: "a".repeat(111),
      };
      expect(() => createVirtualAssigneeSchema.parse(data)).toThrow();
    });
  });

  describe("createAndAssignVirtualAssigneeSchema", () => {
    it("should validate correct creation and assignment", () => {
      const data = {
        intent: "createAndAssignVirtualAssignee",
        name: "John Doe",
        itemId: "item-123",
      };
      expect(() =>
        createAndAssignVirtualAssigneeSchema.parse(data)
      ).not.toThrow();
    });

    it("should reject missing itemId", () => {
      const data = {
        intent: "createAndAssignVirtualAssignee",
        name: "John Doe",
      };
      expect(() => createAndAssignVirtualAssigneeSchema.parse(data)).toThrow();
    });
  });

  describe("updateItemAssigneeSchema", () => {
    it("should validate correct assignee update", () => {
      const data = {
        intent: "updateItemAssignee",
        itemId: "item-123",
        assigneeId: "assignee-456",
      };
      expect(() => updateItemAssigneeSchema.parse(data)).not.toThrow();
    });

    it("should allow null assigneeId (unassign)", () => {
      const data = {
        intent: "updateItemAssignee",
        itemId: "item-123",
        assigneeId: null,
      };
      expect(() => updateItemAssigneeSchema.parse(data)).not.toThrow();
    });

    it("should allow undefined assigneeId", () => {
      const data = {
        intent: "updateItemAssignee",
        itemId: "item-123",
      };
      expect(() => updateItemAssigneeSchema.parse(data)).not.toThrow();
    });
  });
});

// ============================================================================
// Invitation Operation Validation Tests
// ============================================================================

describe("Validation: Invitation Operations", () => {
  describe("inviteUserSchema", () => {
    it("should validate correct user invitation", () => {
      const data = {
        intent: "inviteUser",
        email: "user@example.com",
        role: "editor",
      };
      expect(() => inviteUserSchema.parse(data)).not.toThrow();
    });

    it("should use default role if not provided", () => {
      const data = {
        intent: "inviteUser",
        email: "user@example.com",
      };
      const result = inviteUserSchema.parse(data);
      expect(result.role).toBe("editor");
    });

    it("should reject invalid email", () => {
      const data = {
        intent: "inviteUser",
        email: "not-an-email",
        role: "editor",
      };
      expect(() => inviteUserSchema.parse(data)).toThrow();
    });
  });

  describe("acceptInvitationSchema", () => {
    it("should validate correct invitation acceptance", () => {
      const data = {
        intent: "acceptInvitation",
        invitationId: "invite-123",
      };
      expect(() => acceptInvitationSchema.parse(data)).not.toThrow();
    });

    it("should reject missing invitationId", () => {
      const data = { intent: "acceptInvitation" };
      expect(() => acceptInvitationSchema.parse(data)).toThrow();
    });
  });

  describe("declineInvitationSchema", () => {
    it("should validate correct invitation decline", () => {
      const data = {
        intent: "declineInvitation",
        invitationId: "invite-123",
      };
      expect(() => declineInvitationSchema.parse(data)).not.toThrow();
    });

    it("should reject missing invitationId", () => {
      const data = { intent: "declineInvitation" };
      expect(() => declineInvitationSchema.parse(data)).toThrow();
    });
  });
});
