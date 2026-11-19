
const db = require("../config/db");

const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (error, results) => {
      if (error) return reject(error);
      resolve(results);
    });
  });

const getRecoveryStatus = async (req, res) => {
  try {
    const summaryQuery = `
      SELECT
        COUNT(CASE WHEN event_type = 'repair_success'
          THEN 1 END) AS successful_repairs,

        COUNT(CASE WHEN event_type = 'repair_failed'
          THEN 1 END) AS failed_repairs,

        COUNT(CASE WHEN event_type = 'primary_missing'
          THEN 1 END) AS missing_primaries,

        COUNT(CASE WHEN event_type = 'primary_corrupted'
          THEN 1 END) AS corrupted_primaries,

        COUNT(CASE WHEN event_type = 'cycle_started'
          THEN 1 END) AS total_cycles,

        COUNT(CASE WHEN event_type = 'cycle_completed'
          THEN 1 END) AS completed_cycles,

        COUNT(CASE WHEN event_type = 'cycle_failed'
          THEN 1 END) AS failed_cycles

      FROM recovery_logs
    `;

    const recentEventsQuery = `
      SELECT
        log_id,
        chunk_id,
        event_type,
        source_node,
        target_node,
        message,
        created_at
      FROM recovery_logs
      ORDER BY created_at DESC, log_id DESC
      LIMIT 20
    `;

    const latestCycleQuery = `
      SELECT
        log_id,
        event_type,
        message,
        created_at
      FROM recovery_logs
      WHERE event_type IN (
        'cycle_started',
        'cycle_completed',
        'cycle_failed'
      )
      ORDER BY created_at DESC, log_id DESC
      LIMIT 1
    `;

    const [
      summaryRows,
      recentEvents,
      latestCycleRows,
    ] = await Promise.all([
      runQuery(summaryQuery),
      runQuery(recentEventsQuery),
      runQuery(latestCycleQuery),
    ]);

    res.status(200).json({
      success: true,
      summary: summaryRows[0],
      latestCycle: latestCycleRows[0] || null,
      recentEvents,
    });

  } catch (error) {
    console.error(
      "Recovery status error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch recovery status",
    });
  }
};

module.exports = {
  getRecoveryStatus,
};
