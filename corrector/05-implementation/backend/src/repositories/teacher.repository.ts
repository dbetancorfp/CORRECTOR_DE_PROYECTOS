export interface AuthTeacher {
  id: number;
  username: string;
  passwordHash: string;
  role: 'admin' | 'profesor' | 'tutor';
  accountLocked: boolean;
  failedLoginAttempts: number;
  mustChangePassword: boolean;
}

export interface TeacherListItem {
  id: number;
  username: string;
  role: 'admin' | 'profesor' | 'tutor';
  passwordStatus: 'default' | 'changed';
  accountLocked: boolean;
  failedLoginAttempts: number;
  modules: Array<{ id: number; name: string }>;
}

export interface CreateTeacherData {
  username: string;
  passwordHash: string;
  role: 'admin' | 'profesor' | 'tutor';
  mustChangePassword: boolean;
  moduleId: number;
}

export interface TeacherFilters {
  year?: number;
  legislationId?: number;
  cycleId?: number;
  moduleId?: number;
}

export interface TeacherRepository {
  findAll(filters: TeacherFilters): Promise<TeacherListItem[]>;
  findById(id: number): Promise<AuthTeacher | null>;
  findByUsername(username: string): Promise<AuthTeacher | null>;
  save(data: CreateTeacherData): Promise<TeacherListItem>;
  update(id: number, data: Partial<CreateTeacherData>): Promise<TeacherListItem>;
  delete(id: number): Promise<void>;
  hasCorrections(id: number): Promise<boolean>;
  updateFailedAttempts(id: number, count: number): Promise<void>;
  resetFailedAttempts(id: number): Promise<void>;
  lockAccount(id: number): Promise<void>;
  updatePassword(id: number, newHash: string): Promise<void>;
}
