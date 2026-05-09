export interface UserManagementProps {
  users: User[];
  onCreateUser: (user: CreateUser) => Promise<void>;
  onUpdateUser: (id: string, user: UpdateUser) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onToggleUserStatus: (id: string) => Promise<void>;
  onResetPassword: (id: string) => Promise<void>;
  onAssignRole: (id: string, role: string) => Promise<void>;
  onGetUserPermissions: (id: string) => Promise<Permission[]>;
  onUpdateUserPermissions: (id: string, permissions: string[]) => Promise<void>;
  loading?: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: "active" | "inactive" | "suspended" | "pending";
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  profile: {
    avatar?: string;
    phone?: string;
    department?: string;
    position?: string;
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  security: {
    twoFactorEnabled: boolean;
    passwordChangedAt: string;
    failedLoginAttempts: number;
    lockedUntil?: string;
  };
}

export interface CreateUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password: string;
  permissions: string[];
  profile: {
    phone?: string;
    department?: string;
    position?: string;
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}

export interface UpdateUser {
  firstName?: string;
  lastName?: string;
  role?: string;
  permissions?: string[];
  profile?: {
    phone?: string;
    department?: string;
    position?: string;
  };
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
  };
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
}
