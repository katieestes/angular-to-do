import { computed, effect, Injectable, signal } from '@angular/core';
import { Todo } from '../models/todo.model';

@Injectable({
  providedIn: 'root',
})
export class TodoService {
  private todosSignal = signal<Todo[]>([]);

  todos = this.todosSignal.asReadonly();

  allTodos = computed(() => this.todosSignal());

  activeTodos = computed(() => this.todosSignal().filter((todo: Todo) => !todo.completed));

  completedTodos = computed(() => this.todosSignal().filter((todo: Todo) => todo.completed));

  constructor() {
    this.loadTodosFromStorage();

    effect(() => {
      const todos = this.todosSignal();
      this.saveTodosToStorage(todos);
    });
  }

  private loadTodosFromStorage(): void {
    try {
      const stored = localStorage.getItem('todos');
      if (stored) {
        const todos = JSON.parse(stored);
        const parsedTodos = todos.map((todo: Todo, index: number) => ({
          ...todo,
          createdAt: new Date(todo.createdAt),
          completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
          order: todo.order !== undefined ? todo.order : index,
        }));
        this.todosSignal.set(parsedTodos);
      } else {
        // Seed demo data for portfolio showcase
        this.seedDemoTodos();
      }
    } catch (error) {
      console.error('Error loading todos from storage:', error);
    }
  }

  private seedDemoTodos(): void {
    const now = new Date();
    const demoTodos: Todo[] = [
      {
        id: 1,
        text: 'Welcome to my Angular To-Do App! 👋',
        completed: true,
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        category: 'Getting Started',
        order: 0,
      },
      {
        id: 2,
        text: 'Try adding a new todo using the input above',
        completed: false,
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        category: 'Getting Started',
        order: 1,
      },
      {
        id: 3,
        text: 'Click on a todo to mark it complete',
        completed: false,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        category: 'Getting Started',
        order: 2,
      },
      {
        id: 4,
        text: 'Drag and drop to reorder todos',
        completed: false,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        category: 'Getting Started',
        order: 2,
      },
      {
        id: 5,
        text: 'Build reusable Angular components',
        completed: true,
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        category: 'Portfolio',
        order: 3,
      },
      {
        id: 6,
        text: 'Implement state management with Signals',
        completed: true,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        category: 'Portfolio',
        order: 4,
      },
      {
        id: 7,
        text: 'Add localStorage persistence',
        completed: true,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        category: 'Portfolio',
        order: 5,
      },
      {
        id: 8,
        text: 'Deploy to production',
        completed: false,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        category: 'Portfolio',
        order: 6,
      },
      {
        id: 9,
        text: 'Buy groceries',
        completed: false,
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        category: 'Personal',
        order: 7,
      },
      {
        id: 10,
        text: 'Schedule dentist appointment',
        completed: false,
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        category: 'Personal',
        order: 8,
      },
    ];

    this.todosSignal.set(demoTodos);
  }

  private saveTodosToStorage(todos: Todo[]): void {
    try {
      localStorage.setItem('todos', JSON.stringify(todos));
    } catch (error) {
      console.error('Error saving todos to storage:', error);
    }
  }

  addTodo(text: string, category?: string): void {
    const newTodo: Todo = {
      id: Date.now(),
      text: text.trim(),
      completed: false,
      createdAt: new Date(),
      category: category || 'Uncategorized',
    };
    this.todosSignal.update((todos) => [...todos, newTodo]);
  }

  updateTodo(id: number, text: string, category?: string): void {
    this.todosSignal.update((todos) =>
      todos.map((todo) =>
        todo.id === id
          ? { ...todo, text: text.trim(), category: category || todo.category || 'Uncategorized' }
          : todo
      )
    );
  }

  deleteTodo(id: number): void {
    this.todosSignal.update((todos) => todos.filter((todo) => todo.id !== id));
  }

  toggleTodo(id: number): void {
    this.todosSignal.update((todos) =>
      todos.map((todo) => {
        if (todo.id === id) {
          const newCompleted = !todo.completed;
          return {
            ...todo,
            completed: newCompleted,
            completedAt: newCompleted ? new Date() : undefined,
          };
        }
        return todo;
      })
    );
  }

  clearCompleted(): void {
    this.todosSignal.update((todos) => todos.filter((todo) => !todo.completed));
  }

  clearAll(): void {
    this.todosSignal.set([]);
  }

  reorderTodos(previousIndex: number, currentIndex: number): void {
    this.todosSignal.update((todos) => {
      const reorderedTodos = [...todos];
      const [movedTodo] = reorderedTodos.splice(previousIndex, 1);
      reorderedTodos.splice(currentIndex, 0, movedTodo);

      return reorderedTodos.map((todo, index) => ({
        ...todo,
        order: index,
      }));
    });
  }

  getFilteredTodos(filter: 'all' | 'active' | 'completed', category?: string): Todo[] {
    let todos: Todo[] = [];
    switch (filter) {
      case 'all':
        todos = this.todosSignal();
        break;
      case 'active':
        todos = this.todosSignal().filter((todo) => !todo.completed);
        break;
      case 'completed':
        todos = this.todosSignal().filter((todo) => todo.completed);
        break;
    }

    if (category && category !== 'all') {
      todos = todos.filter((todo) => (todo.category || 'Uncategorized') === category);
    }

    return todos;
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.todosSignal().forEach((todo) => {
      categories.add(todo.category || 'Uncategorized');
    });

    return Array.from(categories).sort();
  }

  updateTodoCategory(id: number, category: string): void {
    this.todosSignal.update((todos) =>
      todos.map((todo) =>
        todo.id === id ? { ...todo, category: category || 'Uncategorized' } : todo
      )
    );
  }

  deleteCategory(categoryName: string): void {
    if (categoryName === 'Uncategorized') {
      return;
    }

    this.todosSignal.update((todos) =>
      todos.map((todo) =>
        (todo.category || 'Uncategorized') === categoryName
          ? { ...todo, category: 'Uncategorized' }
          : todo
      )
    );
  }

  getCategoryCount(categoryName: string): number {
    return this.todosSignal().filter((todo) => (todo.category || 'Uncategorized') === categoryName)
      .length;
  }
}
