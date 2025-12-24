import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  PERMISSIONS, 
  getUserRole, 
  hasPermission, 
  requirePermission,
  isAtLeastRole,
  type UserRole 
} from '../_core/permissions';
import { TRPCError } from '@trpc/server';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

describe('RBAC Permission System', () => {
  describe('Permission Definitions', () => {
    it('should define all required permissions', () => {
      // Read permissions
      expect(PERMISSIONS.VIEW_PROMPTS).toBeDefined();
      expect(PERMISSIONS.VIEW_EVALUATIONS).toBeDefined();
      expect(PERMISSIONS.VIEW_ANALYTICS).toBeDefined();
      expect(PERMISSIONS.VIEW_BUDGETS).toBeDefined();

      // Write permissions
      expect(PERMISSIONS.CREATE_PROMPTS).toBeDefined();
      expect(PERMISSIONS.EDIT_PROMPTS).toBeDefined();
      expect(PERMISSIONS.DELETE_PROMPTS).toBeDefined();
      expect(PERMISSIONS.CREATE_EVALUATIONS).toBeDefined();
      expect(PERMISSIONS.RUN_EVALUATIONS).toBeDefined();
      expect(PERMISSIONS.DELETE_EVALUATIONS).toBeDefined();
      expect(PERMISSIONS.CREATE_AI_PROVIDERS).toBeDefined();
      expect(PERMISSIONS.EDIT_AI_PROVIDERS).toBeDefined();
      expect(PERMISSIONS.DELETE_AI_PROVIDERS).toBeDefined();
      expect(PERMISSIONS.CREATE_BUDGETS).toBeDefined();
      expect(PERMISSIONS.EDIT_BUDGETS).toBeDefined();
      expect(PERMISSIONS.DELETE_BUDGETS).toBeDefined();

      // Team management
      expect(PERMISSIONS.INVITE_MEMBERS).toBeDefined();
      expect(PERMISSIONS.REMOVE_MEMBERS).toBeDefined();
      expect(PERMISSIONS.CHANGE_MEMBER_ROLES).toBeDefined();

      // Billing
      expect(PERMISSIONS.MANAGE_BILLING).toBeDefined();
      expect(PERMISSIONS.VIEW_BILLING).toBeDefined();
    });
  });

  describe('Viewer Role Permissions', () => {
    it('should allow viewers to view prompts', () => {
      expect(PERMISSIONS.VIEW_PROMPTS).toContain('viewer');
    });

    it('should allow viewers to view evaluations', () => {
      expect(PERMISSIONS.VIEW_EVALUATIONS).toContain('viewer');
    });

    it('should allow viewers to view analytics', () => {
      expect(PERMISSIONS.VIEW_ANALYTICS).toContain('viewer');
    });

    it('should allow viewers to view budgets', () => {
      expect(PERMISSIONS.VIEW_BUDGETS).toContain('viewer');
    });

    it('should NOT allow viewers to create prompts', () => {
      expect(PERMISSIONS.CREATE_PROMPTS).not.toContain('viewer');
    });

    it('should NOT allow viewers to edit prompts', () => {
      expect(PERMISSIONS.EDIT_PROMPTS).not.toContain('viewer');
    });

    it('should NOT allow viewers to delete prompts', () => {
      expect(PERMISSIONS.DELETE_PROMPTS).not.toContain('viewer');
    });

    it('should NOT allow viewers to create evaluations', () => {
      expect(PERMISSIONS.CREATE_EVALUATIONS).not.toContain('viewer');
    });

    it('should NOT allow viewers to invite members', () => {
      expect(PERMISSIONS.INVITE_MEMBERS).not.toContain('viewer');
    });

    it('should NOT allow viewers to manage billing', () => {
      expect(PERMISSIONS.MANAGE_BILLING).not.toContain('viewer');
    });
  });

  describe('Member Role Permissions', () => {
    it('should allow members to view all resources', () => {
      expect(PERMISSIONS.VIEW_PROMPTS).toContain('member');
      expect(PERMISSIONS.VIEW_EVALUATIONS).toContain('member');
      expect(PERMISSIONS.VIEW_ANALYTICS).toContain('member');
      expect(PERMISSIONS.VIEW_BUDGETS).toContain('member');
    });

    it('should allow members to create prompts', () => {
      expect(PERMISSIONS.CREATE_PROMPTS).toContain('member');
    });

    it('should allow members to edit prompts', () => {
      expect(PERMISSIONS.EDIT_PROMPTS).toContain('member');
    });

    it('should allow members to create evaluations', () => {
      expect(PERMISSIONS.CREATE_EVALUATIONS).toContain('member');
    });

    it('should allow members to run evaluations', () => {
      expect(PERMISSIONS.RUN_EVALUATIONS).toContain('member');
    });

    it('should allow members to create AI providers', () => {
      expect(PERMISSIONS.CREATE_AI_PROVIDERS).toContain('member');
    });

    it('should NOT allow members to delete prompts', () => {
      expect(PERMISSIONS.DELETE_PROMPTS).not.toContain('member');
    });

    it('should NOT allow members to delete evaluations', () => {
      expect(PERMISSIONS.DELETE_EVALUATIONS).not.toContain('member');
    });

    it('should NOT allow members to create budgets', () => {
      expect(PERMISSIONS.CREATE_BUDGETS).not.toContain('member');
    });

    it('should NOT allow members to invite team members', () => {
      expect(PERMISSIONS.INVITE_MEMBERS).not.toContain('member');
    });

    it('should NOT allow members to manage billing', () => {
      expect(PERMISSIONS.MANAGE_BILLING).not.toContain('member');
    });
  });

  describe('Admin Role Permissions', () => {
    it('should allow admins all member permissions', () => {
      expect(PERMISSIONS.VIEW_PROMPTS).toContain('admin');
      expect(PERMISSIONS.CREATE_PROMPTS).toContain('admin');
      expect(PERMISSIONS.EDIT_PROMPTS).toContain('admin');
      expect(PERMISSIONS.CREATE_EVALUATIONS).toContain('admin');
      expect(PERMISSIONS.RUN_EVALUATIONS).toContain('admin');
    });

    it('should allow admins to delete prompts', () => {
      expect(PERMISSIONS.DELETE_PROMPTS).toContain('admin');
    });

    it('should allow admins to delete evaluations', () => {
      expect(PERMISSIONS.DELETE_EVALUATIONS).toContain('admin');
    });

    it('should allow admins to delete AI providers', () => {
      expect(PERMISSIONS.DELETE_AI_PROVIDERS).toContain('admin');
    });

    it('should allow admins to create budgets', () => {
      expect(PERMISSIONS.CREATE_BUDGETS).toContain('admin');
    });

    it('should allow admins to edit budgets', () => {
      expect(PERMISSIONS.EDIT_BUDGETS).toContain('admin');
    });

    it('should allow admins to delete budgets', () => {
      expect(PERMISSIONS.DELETE_BUDGETS).toContain('admin');
    });

    it('should allow admins to invite members', () => {
      expect(PERMISSIONS.INVITE_MEMBERS).toContain('admin');
    });

    it('should allow admins to remove members', () => {
      expect(PERMISSIONS.REMOVE_MEMBERS).toContain('admin');
    });

    it('should allow admins to view billing', () => {
      expect(PERMISSIONS.VIEW_BILLING).toContain('admin');
    });

    it('should NOT allow admins to change member roles', () => {
      expect(PERMISSIONS.CHANGE_MEMBER_ROLES).not.toContain('admin');
    });

    it('should NOT allow admins to manage billing', () => {
      expect(PERMISSIONS.MANAGE_BILLING).not.toContain('admin');
    });
  });

  describe('Owner Role Permissions', () => {
    it('should allow owners all admin permissions', () => {
      expect(PERMISSIONS.VIEW_PROMPTS).toContain('owner');
      expect(PERMISSIONS.CREATE_PROMPTS).toContain('owner');
      expect(PERMISSIONS.EDIT_PROMPTS).toContain('owner');
      expect(PERMISSIONS.DELETE_PROMPTS).toContain('owner');
      expect(PERMISSIONS.DELETE_EVALUATIONS).toContain('owner');
      expect(PERMISSIONS.INVITE_MEMBERS).toContain('owner');
      expect(PERMISSIONS.REMOVE_MEMBERS).toContain('owner');
    });

    it('should allow owners to change member roles', () => {
      expect(PERMISSIONS.CHANGE_MEMBER_ROLES).toContain('owner');
    });

    it('should allow owners to manage billing', () => {
      expect(PERMISSIONS.MANAGE_BILLING).toContain('owner');
    });

    it('should allow owners to view billing', () => {
      expect(PERMISSIONS.VIEW_BILLING).toContain('owner');
    });

    it('should allow owners to create API keys', () => {
      expect(PERMISSIONS.CREATE_API_KEYS).toContain('owner');
    });

    it('should allow owners to delete API keys', () => {
      expect(PERMISSIONS.DELETE_API_KEYS).toContain('owner');
    });
  });

  describe('isAtLeastRole Function', () => {
    it('should return true when user role equals required role', () => {
      expect(isAtLeastRole('viewer', 'viewer')).toBe(true);
      expect(isAtLeastRole('member', 'member')).toBe(true);
      expect(isAtLeastRole('admin', 'admin')).toBe(true);
      expect(isAtLeastRole('owner', 'owner')).toBe(true);
    });

    it('should return true when user role is higher than required', () => {
      expect(isAtLeastRole('member', 'viewer')).toBe(true);
      expect(isAtLeastRole('admin', 'viewer')).toBe(true);
      expect(isAtLeastRole('admin', 'member')).toBe(true);
      expect(isAtLeastRole('owner', 'viewer')).toBe(true);
      expect(isAtLeastRole('owner', 'member')).toBe(true);
      expect(isAtLeastRole('owner', 'admin')).toBe(true);
    });

    it('should return false when user role is lower than required', () => {
      expect(isAtLeastRole('viewer', 'member')).toBe(false);
      expect(isAtLeastRole('viewer', 'admin')).toBe(false);
      expect(isAtLeastRole('viewer', 'owner')).toBe(false);
      expect(isAtLeastRole('member', 'admin')).toBe(false);
      expect(isAtLeastRole('member', 'owner')).toBe(false);
      expect(isAtLeastRole('admin', 'owner')).toBe(false);
    });
  });

  describe('Role Hierarchy', () => {
    const roles: UserRole[] = ['viewer', 'member', 'admin', 'owner'];

    it('should have correct role hierarchy order', () => {
      // Viewer is lowest
      expect(roles.indexOf('viewer')).toBe(0);
      // Member is second
      expect(roles.indexOf('member')).toBe(1);
      // Admin is third
      expect(roles.indexOf('admin')).toBe(2);
      // Owner is highest
      expect(roles.indexOf('owner')).toBe(3);
    });

    it('should grant all lower role permissions to higher roles', () => {
      // All roles that can view should include all higher roles
      const viewRoles = PERMISSIONS.VIEW_PROMPTS;
      expect(viewRoles).toContain('viewer');
      expect(viewRoles).toContain('member');
      expect(viewRoles).toContain('admin');
      expect(viewRoles).toContain('owner');

      // Create permissions should include member and above
      const createRoles = PERMISSIONS.CREATE_PROMPTS;
      expect(createRoles).not.toContain('viewer');
      expect(createRoles).toContain('member');
      expect(createRoles).toContain('admin');
      expect(createRoles).toContain('owner');

      // Delete permissions should include admin and above
      const deleteRoles = PERMISSIONS.DELETE_PROMPTS;
      expect(deleteRoles).not.toContain('viewer');
      expect(deleteRoles).not.toContain('member');
      expect(deleteRoles).toContain('admin');
      expect(deleteRoles).toContain('owner');

      // Owner-only permissions
      const ownerOnlyRoles = PERMISSIONS.CHANGE_MEMBER_ROLES;
      expect(ownerOnlyRoles).not.toContain('viewer');
      expect(ownerOnlyRoles).not.toContain('member');
      expect(ownerOnlyRoles).not.toContain('admin');
      expect(ownerOnlyRoles).toContain('owner');
    });
  });

  describe('Permission Categories', () => {
    describe('Prompt Permissions', () => {
      it('should have correct prompt permission levels', () => {
        // View: all roles
        expect(PERMISSIONS.VIEW_PROMPTS.length).toBe(4);
        // Create/Edit: member+
        expect(PERMISSIONS.CREATE_PROMPTS.length).toBe(3);
        expect(PERMISSIONS.EDIT_PROMPTS.length).toBe(3);
        // Delete: admin+
        expect(PERMISSIONS.DELETE_PROMPTS.length).toBe(2);
      });
    });

    describe('Evaluation Permissions', () => {
      it('should have correct evaluation permission levels', () => {
        // View: all roles
        expect(PERMISSIONS.VIEW_EVALUATIONS.length).toBe(4);
        // Create/Run: member+
        expect(PERMISSIONS.CREATE_EVALUATIONS.length).toBe(3);
        expect(PERMISSIONS.RUN_EVALUATIONS.length).toBe(3);
        // Delete: admin+
        expect(PERMISSIONS.DELETE_EVALUATIONS.length).toBe(2);
      });
    });

    describe('Budget Permissions', () => {
      it('should have correct budget permission levels', () => {
        // View: all roles
        expect(PERMISSIONS.VIEW_BUDGETS.length).toBe(4);
        // Create/Edit/Delete: admin+ (budgets are sensitive)
        expect(PERMISSIONS.CREATE_BUDGETS.length).toBe(2);
        expect(PERMISSIONS.EDIT_BUDGETS.length).toBe(2);
        expect(PERMISSIONS.DELETE_BUDGETS.length).toBe(2);
      });
    });

    describe('Team Management Permissions', () => {
      it('should have correct team management permission levels', () => {
        // Invite/Remove: admin+
        expect(PERMISSIONS.INVITE_MEMBERS.length).toBe(2);
        expect(PERMISSIONS.REMOVE_MEMBERS.length).toBe(2);
        // Change roles: owner only
        expect(PERMISSIONS.CHANGE_MEMBER_ROLES.length).toBe(1);
      });
    });

    describe('Billing Permissions', () => {
      it('should have correct billing permission levels', () => {
        // View: admin+
        expect(PERMISSIONS.VIEW_BILLING.length).toBe(2);
        // Manage: owner only
        expect(PERMISSIONS.MANAGE_BILLING.length).toBe(1);
      });
    });
  });

  describe('Permission Denied Scenarios', () => {
    it('should deny viewer from creating resources', () => {
      const viewerPermissions = [
        'CREATE_PROMPTS',
        'EDIT_PROMPTS',
        'DELETE_PROMPTS',
        'CREATE_EVALUATIONS',
        'RUN_EVALUATIONS',
        'DELETE_EVALUATIONS',
        'CREATE_AI_PROVIDERS',
        'EDIT_AI_PROVIDERS',
        'DELETE_AI_PROVIDERS',
        'CREATE_BUDGETS',
        'EDIT_BUDGETS',
        'DELETE_BUDGETS',
        'INVITE_MEMBERS',
        'REMOVE_MEMBERS',
        'CHANGE_MEMBER_ROLES',
        'MANAGE_BILLING',
      ] as const;

      viewerPermissions.forEach((perm) => {
        expect(PERMISSIONS[perm]).not.toContain('viewer');
      });
    });

    it('should deny member from deleting resources', () => {
      const deletePermissions = [
        'DELETE_PROMPTS',
        'DELETE_EVALUATIONS',
        'DELETE_AI_PROVIDERS',
        'DELETE_BUDGETS',
        'DELETE_CONTEXT_PACKAGES',
        'DELETE_TEST_SUITES',
      ] as const;

      deletePermissions.forEach((perm) => {
        expect(PERMISSIONS[perm]).not.toContain('member');
      });
    });

    it('should deny admin from owner-only actions', () => {
      const ownerOnlyPermissions = [
        'CHANGE_MEMBER_ROLES',
        'MANAGE_BILLING',
      ] as const;

      ownerOnlyPermissions.forEach((perm) => {
        expect(PERMISSIONS[perm]).not.toContain('admin');
      });
    });
  });
});

describe('Permission Integration Tests', () => {
  describe('Context Package Permissions', () => {
    it('should have correct context package permission levels', () => {
      expect(PERMISSIONS.CREATE_CONTEXT_PACKAGES).toContain('member');
      expect(PERMISSIONS.CREATE_CONTEXT_PACKAGES).toContain('admin');
      expect(PERMISSIONS.CREATE_CONTEXT_PACKAGES).toContain('owner');
      expect(PERMISSIONS.CREATE_CONTEXT_PACKAGES).not.toContain('viewer');

      expect(PERMISSIONS.DELETE_CONTEXT_PACKAGES).toContain('admin');
      expect(PERMISSIONS.DELETE_CONTEXT_PACKAGES).toContain('owner');
      expect(PERMISSIONS.DELETE_CONTEXT_PACKAGES).not.toContain('member');
      expect(PERMISSIONS.DELETE_CONTEXT_PACKAGES).not.toContain('viewer');
    });
  });

  describe('Test Suite Permissions', () => {
    it('should have correct test suite permission levels', () => {
      expect(PERMISSIONS.CREATE_TEST_SUITES).toContain('member');
      expect(PERMISSIONS.RUN_TEST_SUITES).toContain('member');
      expect(PERMISSIONS.DELETE_TEST_SUITES).toContain('admin');
      expect(PERMISSIONS.DELETE_TEST_SUITES).not.toContain('member');
    });
  });

  describe('Optimization Permissions', () => {
    it('should have correct optimization permission levels', () => {
      expect(PERMISSIONS.CREATE_OPTIMIZATIONS).toContain('member');
      expect(PERMISSIONS.CREATE_OPTIMIZATIONS).toContain('admin');
      expect(PERMISSIONS.CREATE_OPTIMIZATIONS).toContain('owner');
      expect(PERMISSIONS.CREATE_OPTIMIZATIONS).not.toContain('viewer');
    });
  });

  describe('Template Permissions', () => {
    it('should have correct template permission levels', () => {
      expect(PERMISSIONS.PUBLISH_TEMPLATES).toContain('member');
      expect(PERMISSIONS.UNPUBLISH_TEMPLATES).toContain('member');
      expect(PERMISSIONS.PUBLISH_TEMPLATES).not.toContain('viewer');
    });
  });

  describe('API Key Permissions', () => {
    it('should have correct API key permission levels', () => {
      expect(PERMISSIONS.CREATE_API_KEYS).toContain('admin');
      expect(PERMISSIONS.CREATE_API_KEYS).toContain('owner');
      expect(PERMISSIONS.DELETE_API_KEYS).toContain('admin');
      expect(PERMISSIONS.DELETE_API_KEYS).toContain('owner');
      expect(PERMISSIONS.CREATE_API_KEYS).not.toContain('member');
      expect(PERMISSIONS.CREATE_API_KEYS).not.toContain('viewer');
    });
  });
});
