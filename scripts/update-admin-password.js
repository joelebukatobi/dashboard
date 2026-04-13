// scripts/update-admin-password.js - Update admin password only
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.development') });

async function updateAdminPassword() {
  console.log('🔐 Updating admin password...\n');
  
  try {
    // Dynamic imports after env is loaded
    const { db, users } = await import('../src/db/index.js');
    const { eq } = await import('drizzle-orm');
    const { default: bcrypt } = await import('bcryptjs');
    
    // Hash new password
    const newPassword = await bcrypt.hash('Admin@123', 10);
    
    // Update admin user password
    const result = await db
      .update(users)
      .set({ password: newPassword })
      .where(eq(users.email, 'admin@example.com'));

    const updatedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'admin@example.com'))
      .limit(1);
    
    if (updatedUsers.length > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('\nUpdated credentials:');
      console.log('  Email: admin@example.com');
      console.log('  Password: Admin@123');
    } else {
      console.log('⚠️  Admin user not found. You may need to run the seed script first.');
    }
    
  } catch (error) {
    console.error('❌ Password update failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

updateAdminPassword();
