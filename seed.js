const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
  console.error(
    '❌ seed.js is disabled in production because it performs a destructive TRUNCATE.'
  );
  process.exit(1);
}

if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
  console.error(
    '❌ Destructive seed blocked. Set ALLOW_DESTRUCTIVE_SEED=true to run seed.js.'
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing from .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});

async function seed() {
  let client;

  try {
    client = await pool.connect();
    console.log('✅ Connected to database');

    // --------------------------------------------------
    // 1. Create database tables from schema.sql
    // --------------------------------------------------

    const schemaPath = path.join(__dirname, 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
      throw new Error('schema.sql was not found in the project root.');
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📦 Creating database tables from schema.sql...');

    await client.query(schemaSql);

    console.log('✅ Database schema loaded successfully');

    // --------------------------------------------------
    // 2. Read JSON configuration
    // --------------------------------------------------

    const configPath = path.join(
      __dirname,
      'public',
      'rules_config.json'
    );

    if (!fs.existsSync(configPath)) {
      throw new Error(
        'public/rules_config.json was not found.'
      );
    }

    const rawConfig = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(rawConfig);

    if (!Array.isArray(config.org_hierarchy)) {
      throw new Error(
        'rules_config.json does not contain a valid org_hierarchy array.'
      );
    }

    const orgHierarchy = config.org_hierarchy;

    console.log(
      `👥 Loaded ${orgHierarchy.length} employees from public/rules_config.json`
    );

    // --------------------------------------------------
    // 3. Validate employee configuration
    // --------------------------------------------------

    for (const emp of orgHierarchy) {
      if (!emp.name || !emp.email || !emp.role) {
        throw new Error(
          `Invalid employee record: ${JSON.stringify(emp)}`
        );
      }
    }

    console.log('✅ Employee configuration validated');

    // --------------------------------------------------
    // 4. Begin transaction
    // --------------------------------------------------

    await client.query('BEGIN');

    // --------------------------------------------------
    // 5. Clear development/test data
    // --------------------------------------------------
    // IMPORTANT:
    // This is destructive. Do not use this approach
    // against production data.
    // --------------------------------------------------

    console.log('🧹 Clearing existing seed data...');

    await client.query(
      'TRUNCATE users, parent_goals CASCADE'
    );

    // --------------------------------------------------
    // 6. Seed Parent Goals
    // --------------------------------------------------

    await client.query(`
      INSERT INTO parent_goals
        (code, title, category, cycle_year)
      VALUES
        (
          'STR-2026-01',
          'Scale NIBSS NPS Integration across 200+ Institutions',
          'Company',
          2026
        ),
        (
          'OPS-2026-04',
          'Maintain 99.9% API Reliability & Security Compliance',
          'Functional',
          2026
        );
    `);

    console.log('✅ Parent goals seeded');

    // --------------------------------------------------
    // 7. Create default password
    // --------------------------------------------------

    const defaultPassword = await bcrypt.hash(
      'Password123!',
      10
    );

    // --------------------------------------------------
    // 8. First Pass: Create employees
    // --------------------------------------------------

    console.log('👥 Creating employees...');

    for (const emp of orgHierarchy) {
      await client.query(
        `
        INSERT INTO users
          (full_name, email, password_hash, role_designation)
        VALUES
          ($1, $2, $3, $4);
        `,
        [
          emp.name,
          emp.email,
          defaultPassword,
          emp.role
        ]
      );
    }

    console.log(
      `✅ Created ${orgHierarchy.length} employees`
    );

    // --------------------------------------------------
    // 9. Second Pass: Resolve manager relationships
    // --------------------------------------------------

    console.log('🔗 Building management hierarchy...');

    for (const emp of orgHierarchy) {

      // Top-level employees may have "Self"
      // as their manager.
      if (
        emp.line_manager === 'Self' &&
        emp.overall_manager === 'Self'
      ) {
        continue;
      }

      // Resolve Line Manager
      if (emp.line_manager !== 'Self') {

        const lineManager = await client.query(
          `
          SELECT id
          FROM users
          WHERE full_name = $1
          `,
          [emp.line_manager]
        );

        if (lineManager.rows.length === 0) {
          throw new Error(
            `Line manager "${emp.line_manager}" not found for ${emp.name}`
          );
        }
      }

      // Resolve Overall Manager
      if (emp.overall_manager !== 'Self') {

        const overallManager = await client.query(
          `
          SELECT id
          FROM users
          WHERE full_name = $1
          `,
          [emp.overall_manager]
        );

        if (overallManager.rows.length === 0) {
          throw new Error(
            `Overall manager "${emp.overall_manager}" not found for ${emp.name}`
          );
        }
      }

      // Update relationships
      await client.query(
        `
        UPDATE users
        SET
          line_manager_id =
            CASE
              WHEN $1 = 'Self' THEN NULL
              ELSE (
                SELECT id
                FROM users
                WHERE full_name = $1
              )
            END,

          overall_manager_id =
            CASE
              WHEN $2 = 'Self' THEN NULL
              ELSE (
                SELECT id
                FROM users
                WHERE full_name = $2
              )
            END

        WHERE email = $3;
        `,
        [
          emp.line_manager,
          emp.overall_manager,
          emp.email
        ]
      );
    }

    console.log('✅ Management hierarchy created');

    // --------------------------------------------------
    // 10. Commit everything
    // --------------------------------------------------

    await client.query('COMMIT');

    console.log('');
    console.log('======================================');
    console.log('🎉 DATABASE SEEDING COMPLETED');
    console.log('======================================');
    console.log(
      `Employees: ${orgHierarchy.length}`
    );
    console.log('Parent Goals: 2');
    console.log('======================================');

  } catch (error) {

    if (client) {
      await client.query('ROLLBACK');
    }

    console.error('');
    console.error('❌ SEEDING FAILED');
    console.error('Reason:', error.message);
    console.error('');

  } finally {

    if (client) {
      client.release();
    }

    await pool.end();
  }
}

seed();