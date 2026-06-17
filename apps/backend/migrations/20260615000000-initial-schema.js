const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. users
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('sysadmin', 'kalab', 'kaprodi', 'admin', 'staflab'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'paused'),
        allowNull: false,
        defaultValue: 'active',
      },
      initials: {
        type: DataTypes.STRING(5),
        allowNull: true,
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      token_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    // 2. rooms
    await queryInterface.createTable('rooms', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      floor: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      pic_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('rooms', ['pic_user_id']);

    // 3. inventory
    await queryInterface.createTable('inventory', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      room_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'rooms', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      condition: {
        type: DataTypes.ENUM('Baik', 'Perlu cek', 'Maintenance', 'Rusak'),
        allowNull: false,
        defaultValue: 'Baik',
      },
      last_checked: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      acquired_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      value: {
        type: DataTypes.BIGINT,
        allowNull: true,
        defaultValue: 0,
      },
      serial: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      specs: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });
    await queryInterface.addIndex('inventory', ['room_id']);
    await queryInterface.addIndex('inventory', ['category']);
    await queryInterface.addIndex('inventory', ['condition']);
    await queryInterface.addIndex('inventory', ['deleted_at']);

    // 4. bhp
    await queryInterface.createTable('bhp', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      stock: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      min_stock: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      last_in: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    // 5. drafts
    await queryInterface.createTable('drafts', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'draft',
      },
      revision_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      finalized_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      finalized_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('drafts', ['created_by']);
    await queryInterface.addIndex('drafts', ['finalized_by']);
    await queryInterface.addIndex('drafts', ['status']);

    // 6. draft_items
    await queryInterface.createTable('draft_items', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      draft_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'drafts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      kind: {
        type: DataTypes.ENUM('Inventaris', 'BHP'),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      price: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      link: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      replaces: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('draft_items', ['draft_id']);

    // 7. draft_approvals
    await queryInterface.createTable('draft_approvals', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      draft_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'draft_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: DataTypes.ENUM('approved', 'rejected'),
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('draft_approvals', ['draft_item_id']);
    await queryInterface.addIndex('draft_approvals', ['approved_by']);

    // 8. maintenance_logs
    await queryInterface.createTable('maintenance_logs', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(30),
        allowNull: true,
        unique: true,
      },
      inventory_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'inventory', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tech_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      action: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      condition_after: {
        type: DataTypes.ENUM('Baik', 'Perlu cek', 'Maintenance', 'Rusak'),
        allowNull: false,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('maintenance_logs', ['inventory_id']);
    await queryInterface.addIndex('maintenance_logs', ['tech_user_id']);
    await queryInterface.addIndex('maintenance_logs', ['date']);

    // 9. maintenance_bhp
    await queryInterface.createTable('maintenance_bhp', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      maintenance_log_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'maintenance_logs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      bhp_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'bhp', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      qty_used: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('maintenance_bhp', ['maintenance_log_id']);
    await queryInterface.addIndex('maintenance_bhp', ['bhp_id']);

    // 10. receiving
    await queryInterface.createTable('receiving', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      draft_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'draft_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      received_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      received_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      qty_received: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('receiving', ['draft_item_id']);
    await queryInterface.addIndex('receiving', ['received_by']);

    // 11. labels
    await queryInterface.createTable('labels', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      inventory_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'inventory', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      label_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      qr_data: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      photo_url: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('labels', ['inventory_id']);

    // 12. audit_logs
    await queryInterface.createTable('audit_logs', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      target: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      previous_hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['created_at']);

    // 13. revoked_tokens
    await queryInterface.createTable('revoked_tokens', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      jti: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('revoked_tokens', ['expires_at']);

    // 14. refresh_tokens
    await queryInterface.createTable('refresh_tokens', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      jti: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      is_used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('refresh_tokens', ['user_id']);
    await queryInterface.addIndex('refresh_tokens', ['expires_at']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop in reverse dependency order
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('revoked_tokens');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('labels');
    await queryInterface.dropTable('receiving');
    await queryInterface.dropTable('maintenance_bhp');
    await queryInterface.dropTable('maintenance_logs');
    await queryInterface.dropTable('draft_approvals');
    await queryInterface.dropTable('draft_items');
    await queryInterface.dropTable('drafts');
    await queryInterface.dropTable('bhp');
    await queryInterface.dropTable('inventory');
    await queryInterface.dropTable('rooms');
    await queryInterface.dropTable('users');
  },
};
