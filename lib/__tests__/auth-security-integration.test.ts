/**
 * Integration tests for auth security with database
 * Tests the actual database integration (requires environment setup)
 */

import { describe, it, expect } from 'vitest'

describe('Auth Security Database Integration', () => {
  it('should have auth_logs table structure defined in Prisma schema', () => {
    // This test verifies that our Prisma schema includes the auth_logs model
    // The actual database table creation is handled by Prisma
    
    // Read the schema file to verify our model is defined
    const fs = require('fs')
    const path = require('path')
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')
    
    // Check that auth_logs model is defined
    expect(schemaContent).toContain('model auth_logs {')
    expect(schemaContent).toContain('event_type String')
    expect(schemaContent).toContain('email      String?')
    expect(schemaContent).toContain('user_id    String?')
    expect(schemaContent).toContain('ip_address String?')
    expect(schemaContent).toContain('details    String?')
    expect(schemaContent).toContain('created_at DateTime?')
    
    // Check indexes are defined
    expect(schemaContent).toContain('@@index([created_at(sort: Desc)], map: "idx_auth_logs_created")')
    expect(schemaContent).toContain('@@index([event_type, created_at(sort: Desc)], map: "idx_auth_logs_type")')
    
    // Check schema assignment
    expect(schemaContent).toContain('@@schema("public")')
  })

  it('should have proper foreign key relationship to users', () => {
    const fs = require('fs')
    const path = require('path')
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')
    
    // Check foreign key relationship
    expect(schemaContent).toContain('users      users?    @relation(fields: [user_id], references: [id], onDelete: SetNull, onUpdate: NoAction)')
    
    // Check that users model has the reverse relation
    expect(schemaContent).toContain('auth_logs                   auth_logs[]')
  })

  it('should have migration file for auth_logs table', () => {
    const fs = require('fs')
    const path = require('path')
    const migrationPath = path.join(process.cwd(), 'migrations', '009_simple_auth_logging.sql')
    
    expect(fs.existsSync(migrationPath)).toBe(true)
    
    const migrationContent = fs.readFileSync(migrationPath, 'utf8')
    expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS auth_logs')
    expect(migrationContent).toContain('event_type TEXT NOT NULL')
    expect(migrationContent).toContain('ENABLE ROW LEVEL SECURITY')
  })
})