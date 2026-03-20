const { EventEmitter } = require('events');

/**
 * Simple in-memory sequential job queue.
 * Processes jobs one at a time with configurable delay between executions.
 */
class JobQueue extends EventEmitter {
  constructor(name, { delayMs = 2000 } = {}) {
    super();
    this.name = name;
    this.delayMs = delayMs;
    this.jobs = [];       // { id, data, status, result, error }
    this.handler = null;
    this.processing = false;
  }

  /** Register async handler and start processing */
  process(handlerFn) {
    this.handler = handlerFn;
    this._processNext();
  }

  /** Add job to queue. Skip if same id already pending/running. */
  add(jobId, data = {}) {
    const exists = this.jobs.find(j => j.id === jobId && (j.status === 'pending' || j.status === 'running'));
    if (exists) return false;

    this.jobs.push({ id: jobId, data, status: 'pending', result: null, error: null });
    this._processNext();
    return true;
  }

  /** Get queue status counts */
  getStatus() {
    const counts = { pending: 0, running: 0, completed: 0, failed: 0 };
    for (const j of this.jobs) counts[j.status]++;
    return { name: this.name, ...counts, total: this.jobs.length };
  }

  /** Clear completed/failed jobs from history */
  clearHistory() {
    this.jobs = this.jobs.filter(j => j.status === 'pending' || j.status === 'running');
  }

  async _processNext() {
    if (this.processing || !this.handler) return;

    const job = this.jobs.find(j => j.status === 'pending');
    if (!job) return;

    this.processing = true;
    job.status = 'running';
    console.log(`[${this.name}] Processing job: ${job.id}`);

    try {
      job.result = await this.handler(job);
      job.status = 'completed';
      this.emit('completed', job);
    } catch (err) {
      job.error = err.message;
      job.status = 'failed';
      this.emit('failed', job);
      console.error(`[${this.name}] Job failed: ${job.id} — ${err.message}`);
    }

    this.processing = false;

    // Delay before next job to avoid rate limiting
    const nextJob = this.jobs.find(j => j.status === 'pending');
    if (nextJob) {
      setTimeout(() => this._processNext(), this.delayMs);
    }
  }
}

module.exports = JobQueue;
