import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@vercel/postgres", () => ({ sql: {} }));

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockWhere = vi.fn();
const mockSet = vi.fn();
const mockFrom = vi.fn();
const mockOrderBy = vi.fn();
const mockValues = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
}));

const mockExtractTodos = vi.fn();
vi.mock("./extract-todos", () => ({
  extractTodos: mockExtractTodos,
}));

function setupSelect(result: unknown[]) {
  mockOrderBy.mockReturnValue(Promise.resolve(result));
  mockWhere.mockImplementation(() => ({
    orderBy: mockOrderBy,
    limit: () => Promise.resolve(result),
  }));
  mockFrom.mockReturnValue({ where: mockWhere });
  mockSelect.mockReturnValue({ from: mockFrom });
}

function setupInsertSuccess() {
  mockValues.mockReturnValue(Promise.resolve(undefined));
  mockInsert.mockReturnValue({ values: mockValues });
}

function setupUpdateSuccess() {
  mockWhere.mockReturnValue(Promise.resolve(undefined));
  mockSet.mockReturnValue({ where: mockWhere });
  mockUpdate.mockReturnValue({ set: mockSet });
}

describe("todo-service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupInsertSuccess();
    setupUpdateSuccess();
  });

  describe("markDone", () => {
    it("updates item status to done", async () => {
      const { markDone } = await import("./todo-service");
      await markDone(1);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe("markDismissed", () => {
    it("updates item status to dismissed", async () => {
      const { markDismissed } = await import("./todo-service");
      await markDismissed(2);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe("getTodosForDate", () => {
    it("returns sorted pending items for a date", async () => {
      const items = [
        { id: 1, date: "2026-05-14", title: "Urgent fix", is_urgent: true, status: "pending", created_at: new Date() },
        { id: 2, date: "2026-05-14", title: "Normal task", is_urgent: false, status: "pending", created_at: new Date() },
      ];
      setupSelect(items);

      const { getTodosForDate } = await import("./todo-service");
      const result = await getTodosForDate("2026-05-14");

      expect(result).toHaveLength(2);
      expect(mockSelect).toHaveBeenCalled();
    });

    it("returns empty array when no items", async () => {
      setupSelect([]);

      const { getTodosForDate } = await import("./todo-service");
      const result = await getTodosForDate("2026-05-14");

      expect(result).toEqual([]);
    });
  });

  describe("getTodoItem", () => {
    it("returns item by id", async () => {
      const item = { id: 1, date: "2026-05-14", title: "Test task", is_urgent: true, status: "pending", created_at: new Date() };
      setupSelect([item]);

      const { getTodoItem } = await import("./todo-service");
      const result = await getTodoItem(1);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.title).toBe("Test task");
    });

    it("returns null when item not found", async () => {
      setupSelect([]);

      const { getTodoItem } = await import("./todo-service");
      const result = await getTodoItem(999);

      expect(result).toBeNull();
    });
  });

  describe("generateTodoList", () => {
    it("generates list with new items and carry-forward", async () => {
      mockExtractTodos.mockResolvedValue([
        { title: "Fix payment gateway", is_urgent: true },
        { title: "Review inventory", is_urgent: false },
      ]);

      const carryForwardItems = [
        { id: 1, date: "2026-05-13", title: "Old pending task", is_urgent: false, status: "pending", created_at: new Date() },
      ];

      const newSavedItems = [
        { id: 2, date: "2026-05-14", title: "Fix payment gateway", is_urgent: true, status: "pending", created_at: new Date() },
        { id: 3, date: "2026-05-14", title: "Review inventory", is_urgent: false, status: "pending", created_at: new Date() },
      ];

      mockOrderBy
        .mockReturnValueOnce(Promise.resolve(carryForwardItems))
        .mockReturnValueOnce(Promise.resolve(newSavedItems));
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const { generateTodoList } = await import("./todo-service");
      const result = await generateTodoList("Payment gateway issue", "2026-05-14");

      expect(mockExtractTodos).toHaveBeenCalledWith("Payment gateway issue");
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("deduplicates new items against carry-forward items", async () => {
      mockExtractTodos.mockResolvedValue([
        { title: "Old pending task", is_urgent: false },
        { title: "Brand new task", is_urgent: true },
      ]);

      const carryForwardItems = [
        { id: 1, date: "2026-05-13", title: "Old pending task", is_urgent: false, status: "pending", created_at: new Date() },
      ];

      const newSavedItems = [
        { id: 2, date: "2026-05-14", title: "Brand new task", is_urgent: true, status: "pending", created_at: new Date() },
      ];

      mockOrderBy
        .mockReturnValueOnce(Promise.resolve(carryForwardItems))
        .mockReturnValueOnce(Promise.resolve(newSavedItems));
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const { generateTodoList } = await import("./todo-service");
      const result = await generateTodoList("Tasks", "2026-05-14");

      const titles = result.map((i: { title: string }) => i.title);
      expect(titles.filter((t: string) => t === "Old pending task")).toHaveLength(1);
      expect(titles).toContain("Brand new task");
    });

    it("returns only carry-forward when no new items extracted", async () => {
      mockExtractTodos.mockResolvedValue([]);

      const carryForwardItems = [
        { id: 1, date: "2026-05-13", title: "Old pending task", is_urgent: true, status: "pending", created_at: new Date() },
      ];

      mockOrderBy
        .mockReturnValueOnce(Promise.resolve(carryForwardItems))
        .mockReturnValueOnce(Promise.resolve([]));
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const { generateTodoList } = await import("./todo-service");
      const result = await generateTodoList("", "2026-05-14");

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Old pending task");
    });
  });
});
