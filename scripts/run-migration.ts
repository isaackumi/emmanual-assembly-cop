import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(migrationFile: string) {
  try {
    console.log(`🔄 Running migration: ${migrationFile}`)
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations', migrationFile)
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 100)}...`)
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          console.error(`❌ Error executing statement:`, error)
          console.error(`Statement: ${statement.substring(0, 200)}...`)
          return
        }
      }
    }
    
    console.log(`✅ Migration ${migrationFile} completed successfully!`)
    
  } catch (error) {
    console.error('❌ Error running migration:', error)
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('❌ Please provide a migration file name')
  console.log('Usage: bun run scripts/run-migration.ts <migration-file>')
  process.exit(1)
}

runMigration(migrationFile)
