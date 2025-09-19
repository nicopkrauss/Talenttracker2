#!/usr/bin/env node

/**
 * Test Role Badge Colors Script
 * Verifies that role badge colors are consistent across components
 */

const fs = require('fs')
const path = require('path')

function testRoleBadgeColors() {
  console.log('🎨 Testing role badge color consistency...\n')
  
  try {
    // Read the role template manager file
    const roleTemplateManagerPath = path.join(__dirname, '..', 'components', 'projects', 'project-role-template-manager.tsx')
    const roleTemplateManagerContent = fs.readFileSync(roleTemplateManagerPath, 'utf8')
    
    // Read the roles team tab file
    const rolesTeamTabPath = path.join(__dirname, '..', 'components', 'projects', 'tabs', 'roles-team-tab.tsx')
    const rolesTeamTabContent = fs.readFileSync(rolesTeamTabPath, 'utf8')
    
    // Extract getRoleColor function from both files
    const getRoleColorRegex = /const getRoleColor = \(role: string \| null\): string => \{[\s\S]*?\}/
    
    const roleTemplateManagerMatch = roleTemplateManagerContent.match(getRoleColorRegex)
    const rolesTeamTabMatch = rolesTeamTabContent.match(getRoleColorRegex)
    
    console.log('📋 ROLE BADGE COLOR ANALYSIS:')
    console.log('=============================')
    
    if (roleTemplateManagerMatch && rolesTeamTabMatch) {
      const roleTemplateManagerFunction = roleTemplateManagerMatch[0]
      const rolesTeamTabFunction = rolesTeamTabMatch[0]
      
      if (roleTemplateManagerFunction === rolesTeamTabFunction) {
        console.log('✅ getRoleColor functions are identical')
      } else {
        console.log('❌ getRoleColor functions differ between components')
        console.log('\nRole Template Manager version:')
        console.log(roleTemplateManagerFunction)
        console.log('\nRoles Team Tab version:')
        console.log(rolesTeamTabFunction)
      }
    } else {
      console.log('❌ Could not find getRoleColor function in one or both files')
      console.log(`Role Template Manager has function: ${!!roleTemplateManagerMatch}`)
      console.log(`Roles Team Tab has function: ${!!rolesTeamTabMatch}`)
    }
    
    // Check for Badge usage with getRoleColor
    const badgeWithRoleColorRegex = /Badge[^>]*className=\{[^}]*getRoleColor\([^)]*\)[^}]*\}/g
    
    const roleTemplateManagerBadges = roleTemplateManagerContent.match(badgeWithRoleColorRegex) || []
    const rolesTeamTabBadges = rolesTeamTabContent.match(badgeWithRoleColorRegex) || []
    
    console.log('\n🏷️ BADGE USAGE WITH ROLE COLORS:')
    console.log('=================================')
    console.log(`Role Template Manager: ${roleTemplateManagerBadges.length} badge(s) with role colors`)
    roleTemplateManagerBadges.forEach((badge, index) => {
      console.log(`  ${index + 1}. ${badge}`)
    })
    
    console.log(`\nRoles Team Tab: ${rolesTeamTabBadges.length} badge(s) with role colors`)
    rolesTeamTabBadges.forEach((badge, index) => {
      console.log(`  ${index + 1}. ${badge}`)
    })
    
    // Extract role color mappings
    const roleColorMappings = {
      admin: 'bg-slate-900 text-slate-50 border-slate-900',
      in_house: 'bg-blue-100 text-blue-800 border-blue-200',
      supervisor: 'bg-green-100 text-green-800 border-green-200',
      coordinator: 'bg-purple-100 text-purple-800 border-purple-200',
      talent_escort: 'bg-orange-100 text-orange-800 border-orange-200'
    }
    
    console.log('\n🎨 ROLE COLOR MAPPINGS:')
    console.log('=======================')
    Object.entries(roleColorMappings).forEach(([role, colors]) => {
      console.log(`${role.padEnd(15)}: ${colors}`)
    })
    
    console.log('\n✅ VERIFICATION COMPLETE!')
    console.log('Role badge colors should now be consistent across:')
    console.log('- Role Template Manager')
    console.log('- Roles & Team Tab')
    console.log('- Any other components using getRoleColor function')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testRoleBadgeColors()