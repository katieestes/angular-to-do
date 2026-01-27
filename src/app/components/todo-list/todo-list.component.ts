import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TodoService } from '../../services/todo.service';
import { Todo } from '../../models/todo.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  bootstrapChevronDown,
  bootstrapChevronRight,
  bootstrapTrash,
  bootstrapPlus,
  bootstrapSearch,
} from '@ng-icons/bootstrap-icons';

type FilterType = 'all' | 'active' | 'completed';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgIcon, DragDropModule],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css',
  providers: [
    provideIcons({
      bootstrapChevronDown,
      bootstrapChevronRight,
      bootstrapTrash,
      bootstrapPlus,
      bootstrapSearch,
    }),
  ],
})
export class TodoListComponent {
  private todoService = inject(TodoService);

  todoInput = new FormControl('', [Validators.required, Validators.minLength(3)]);

  currentFilter = signal<FilterType>('all');

  searchTerm = signal<string>('');

  selectedCategory = signal<string>('all');
  categoryInput = new FormControl('');
  newCategoryInput = new FormControl('');
  showNewCategoryInput = signal<boolean>(false);

  pendingCategory = signal<string | null>(null);

  categories = computed(() => {
    const existing = this.todoService.getCategories();
    const pending = this.pendingCategory();
    if (pending && !existing.includes(pending)) {
      return [...existing, pending].sort();
    }
    return existing;
  });

  todosByCategory = computed(() => {
    const filteredTodos = this.todos();
    const grouped = new Map<string, Todo[]>();

    filteredTodos.forEach((todo) => {
      const category = todo.category || 'Uncategorized';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(todo);
    });

    const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
      if (a === 'Uncategorized') return -1;
      if (b === 'Uncategorized') return 1;

      return a.localeCompare(b);
    });

    return sortedCategories.map((category) => ({
      category,
      todos: grouped.get(category)!,
      count: grouped.get(category)!.length,
    }));
  });

  todos = computed(() => {
    const filter = this.currentFilter();
    const searchTerm = this.searchTerm().toLowerCase().trim();
    const category = this.selectedCategory();
    const allTodos = this.todoService.todos();

    let filteredTodos: Todo[] = [];
    switch (filter) {
      case 'all':
        filteredTodos = allTodos;
        break;
      case 'active':
        filteredTodos = allTodos.filter((todo) => !todo.completed);
        break;
      case 'completed':
        filteredTodos = allTodos.filter((todo) => todo.completed);
        break;
    }

    if (category && category !== 'all') {
      filteredTodos = filteredTodos.filter(
        (todo) => (todo.category || 'Uncategorized') === category
      );
    }

    if (searchTerm) {
      filteredTodos = filteredTodos.filter((todo) => todo.text.toLowerCase().includes(searchTerm));
    }

    const hasManualOrder = filteredTodos.some((todo) => todo.order !== undefined);

    if (hasManualOrder) {
      return filteredTodos.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;

        return this.defaultSort(a, b);
      });
    } else {
      return filteredTodos.sort((a, b) => {
        // First sort by category
        const categoryA = a.category || 'Uncategorized';
        const categoryB = b.category || 'Uncategorized';
        if (categoryA !== categoryB) {
          if (categoryA === 'Uncategorized') return -1;
          if (categoryB === 'Uncategorized') return 1;
          return categoryA.localeCompare(categoryB);
        }
        // Then by default sort
        return this.defaultSort(a, b);
      });
    }
  });

  private defaultSort(a: Todo, b: Todo): number {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; // Non-completed first
    }

    // Both are non-completed: sort by createdAt (newest first)
    if (!a.completed && !b.completed) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }

    // Both are completed: sort by completedAt (last completed first)
    if (a.completed && b.completed) {
      const aCompletedAt = a.completedAt?.getTime() || 0;
      const bCompletedAt = b.completedAt?.getTime() || 0;
      return bCompletedAt - aCompletedAt;
    }

    return 0;
  }

  activeCount = computed(() => this.todoService.activeTodos().length);

  completedCount = computed(() => this.todoService.completedTodos().length);

  showForm = signal<boolean>(false);

  toggleForm(): void {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.pendingCategory.set(null);
      this.showNewCategoryInput.set(false);
    }
  }

  editingId = signal<number | null>(null);
  editText = new FormControl('');

  collapsedCategories = signal<Set<string>>(new Set());

  isCategoryCollapsed(category: string): boolean {
    return this.collapsedCategories().has(category);
  }

  toggleCategory(category: string): void {
    const current = new Set(this.collapsedCategories());
    if (current.has(category)) {
      current.delete(category);
    } else {
      current.add(category);
    }

    this.collapsedCategories.set(current);
  }

  addTodo(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    const value = this.todoInput.value?.trim();
    const category = this.categoryInput.value?.trim() || 'Uncategorized';
    if (value && value.length >= 3) {
      this.todoService.addTodo(value, category);
      this.todoInput.reset();
      this.categoryInput.reset();
      this.pendingCategory.set(null);
      this.toggleForm();
    } else {
      this.todoInput.markAsTouched();
    }
  }

  toggleTodo(id: number): void {
    this.todoService.toggleTodo(id);
  }

  deleteTodo(id: number): void {
    this.todoService.deleteTodo(id);
  }

  startEdit(todo: Todo): void {
    this.editingId.set(todo.id);
    this.editText.setValue(todo.text);
    this.categoryInput.setValue(todo.category || '');
  }

  saveEdit(id: number): void {
    if (this.editText.valid && this.editText.value?.trim()) {
      const category = this.categoryInput.value?.trim();
      this.todoService.updateTodo(id, this.editText.value.trim() || '', category);
      this.pendingCategory.set(null);
      this.cancelEdit();
    }
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editText.reset();
    this.categoryInput.reset();
    this.pendingCategory.set(null);
    this.showNewCategoryInput.set(false);
  }

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  onCategorySelectChange(value: string): void {
    if (value === '__new__') {
      this.showNewCategoryInput.set(true);
      this.categoryInput.setValue('');
    } else {
      this.showNewCategoryInput.set(false);
      this.categoryInput.setValue(value);
    }
  }

  confirmNewCategory(): void {
    const newCategory = this.newCategoryInput.value?.trim();
    if (newCategory) {
      this.pendingCategory.set(newCategory);
      this.categoryInput.setValue(newCategory);
      this.showNewCategoryInput.set(false);
      this.newCategoryInput.reset();
    }
  }

  cancelNewCategory(): void {
    this.showNewCategoryInput.set(false);
    this.newCategoryInput.reset();
    this.pendingCategory.set(null);
    this.categoryInput.setValue('Uncategorized');
  }

  deleteCategory(category: string): void {
    if (category === 'Uncategorized') {
      return;
    }

    if (this.selectedCategory() === category) {
      this.selectedCategory.set('all');
    }

    this.todoService.deleteCategory(category);
  }

  getCategoryCount(category: string): number {
    return this.todoService.getCategoryCount(category);
  }

  setFilter(filter: FilterType): void {
    this.currentFilter.set(filter);
  }

  clearCompleted(): void {
    this.todoService.clearCompleted();
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  drop(event: CdkDragDrop<Todo[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const currentTodos = this.todos();

    const previousTodo = currentTodos[event.previousIndex];
    const currentTodo = currentTodos[event.currentIndex];

    const allTodos = this.todoService.todos();
    const previousIndexInAll = allTodos.findIndex((t) => t.id === previousTodo.id);
    const currentIndexInAll = allTodos.findIndex((t) => t.id === currentTodo.id);

    this.todoService.reorderTodos(previousIndexInAll, currentIndexInAll);
  }
}
