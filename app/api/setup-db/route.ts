import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { handleError, successResponse } from '@/lib/errorHandler';
import { DB_SCHEMA, SUCCESS_MESSAGES } from '@/utils/constants';

/**
 * POST /api/setup-db
 * Initialize database tables
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Starting database setup');

    // Execute all table creation queries
    const tables = ['PROJECTS', 'FEEDBACK', 'ANALYSES'] as const;
    const results: Record<string, boolean> = {};

    for (const table of tables) {
      try {
        logger.info(`Creating table: ${table}`);

        const { error } = await supabase.rpc('exec_sql', {
          sql_query: DB_SCHEMA[table],
        });

        if (error) {
          // Try alternative approach using direct query
          logger.warn(`RPC failed for ${table}, trying direct query`);

          // For Supabase, we can use the REST API endpoint
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ sql_query: DB_SCHEMA[table] }),
            }
          );

          if (!response.ok) {
            logger.error(`Failed to create table ${table}`, {
              status: response.status,
              statusText: response.statusText,
            });
            results[table] = false;
            continue;
          }
        }

        results[table] = true;
        logger.info(`Table ${table} created successfully`);
      } catch (tableError) {
        logger.error(`Error creating table ${table}`, {
          error:
            tableError instanceof Error
              ? tableError.message
              : 'Unknown error',
        });
        results[table] = false;
      }
    }

    // Check if all tables were created
    const allSuccess = Object.values(results).every((v) => v === true);

    if (allSuccess) {
      logger.info('Database setup completed successfully', { results });
      return successResponse(
        { results, message: SUCCESS_MESSAGES.DB_SETUP_COMPLETE },
        SUCCESS_MESSAGES.DB_SETUP_COMPLETE,
        201
      );
    } else {
      logger.warn('Database setup completed with some failures', { results });
      return successResponse(
        {
          results,
          message: 'Database setup completed with some issues. Please check logs.',
        },
        'Database setup completed with some issues',
        200
      );
    }
  } catch (error) {
    logger.error('Database setup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return handleError(error);
  }
}

/**
 * GET /api/setup-db
 * Check database status
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Checking database status');

    // Check if tables exist by querying them
    const tableChecks = {
      projects: false,
      feedbacks: false,
      analyses: false,
    };

    try {
      const { error: projectError } = await supabase
        .from('projects')
        .select('id')
        .limit(1);
      tableChecks.projects = !projectError;
    } catch (e) {
      tableChecks.projects = false;
    }

    try {
      const { error: feedbackError } = await supabase
        .from('feedbacks')
        .select('id')
        .limit(1);
      tableChecks.feedbacks = !feedbackError;
    } catch (e) {
      tableChecks.feedbacks = false;
    }

    try {
      const { error: analysisError } = await supabase
        .from('analyses')
        .select('id')
        .limit(1);
      tableChecks.analyses = !analysisError;
    } catch (e) {
      tableChecks.analyses = false;
    }

    const allTablesExist = Object.values(tableChecks).every((v) => v === true);

    return successResponse({
      status: allTablesExist ? 'ready' : 'incomplete',
      tables: tableChecks,
      message: allTablesExist
        ? 'Database is ready'
        : 'Some tables are missing. Run POST /api/setup-db to initialize.',
    });
  } catch (error) {
    logger.error('Database status check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return handleError(error);
  }
}
