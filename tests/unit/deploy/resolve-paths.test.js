import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

const SCRIPT = 'scripts/deploy/resolve-paths.sh';

function resolve(env) {
  const out = execFileSync('bash', [SCRIPT], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return Object.fromEntries(
    out.trim().split('\n').map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
  );
}

function resolveFails(env) {
  try {
    execFileSync('bash', [SCRIPT], {
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return null;
  } catch (err) {
    return err.stderr.toString();
  }
}

describe('resolve-paths.sh', () => {
  it('strips the /home/<user> prefix for the FTP root', () => {
    const r = resolve({ DEPLOY_PATH: '/home/joel/sandbox', CPANEL_FTP_USER: 'joel' });
    expect(r.deploy_dir).toBe('/home/joel/sandbox');
    expect(r.ftp_dir).toBe('/sandbox/');
  });

  it('leaves a path that does not start with the home prefix alone', () => {
    const r = resolve({ DEPLOY_PATH: '/var/www/app', CPANEL_FTP_USER: 'joel' });
    expect(r.deploy_dir).toBe('/var/www/app');
    expect(r.ftp_dir).toBe('/var/www/app/');
  });

  it('tolerates a trailing carriage return from a pasted secret', () => {
    const r = resolve({ DEPLOY_PATH: '/home/joel/sandbox\r', CPANEL_FTP_USER: 'joel' });
    expect(r.deploy_dir).toBe('/home/joel/sandbox');
    expect(r.ftp_dir).toBe('/sandbox/');
  });

  it('tolerates surrounding whitespace', () => {
    const r = resolve({ DEPLOY_PATH: '  /home/joel/sandbox  ', CPANEL_FTP_USER: 'joel' });
    expect(r.deploy_dir).toBe('/home/joel/sandbox');
    expect(r.ftp_dir).toBe('/sandbox/');
  });

  it('normalises a trailing slash on the input', () => {
    const r = resolve({ DEPLOY_PATH: '/home/joel/sandbox/', CPANEL_FTP_USER: 'joel' });
    expect(r.deploy_dir).toBe('/home/joel/sandbox');
    expect(r.ftp_dir).toBe('/sandbox/');
  });

  it('maps the home directory itself to the FTP root', () => {
    const r = resolve({ DEPLOY_PATH: '/home/joel', CPANEL_FTP_USER: 'joel' });
    expect(r.deploy_dir).toBe('/home/joel');
    expect(r.ftp_dir).toBe('/');
  });

  it('handles nested paths under home', () => {
    const r = resolve({ DEPLOY_PATH: '/home/joel/apps/sandbox/current', CPANEL_FTP_USER: 'joel' });
    expect(r.ftp_dir).toBe('/apps/sandbox/current/');
  });

  it('does not strip a prefix belonging to a different user', () => {
    const r = resolve({ DEPLOY_PATH: '/home/someoneelse/sandbox', CPANEL_FTP_USER: 'joel' });
    expect(r.ftp_dir).toBe('/home/someoneelse/sandbox/');
  });

  it('fails loudly when DEPLOY_PATH is empty', () => {
    const stderr = resolveFails({ DEPLOY_PATH: '', CPANEL_FTP_USER: 'joel' });
    expect(stderr).toContain('DEPLOY_PATH resolved to empty value');
  });

  it('fails loudly when DEPLOY_PATH is only whitespace', () => {
    const stderr = resolveFails({ DEPLOY_PATH: '   ', CPANEL_FTP_USER: 'joel' });
    expect(stderr).toContain('DEPLOY_PATH resolved to empty value');
  });
});

describe('validate-secrets.sh', () => {
  const SECRETS = 'scripts/deploy/validate-secrets.sh';

  it('passes when every named variable is set', () => {
    const out = execFileSync('bash', [SECRETS, 'A_VAR', 'B_VAR'], {
      env: { ...process.env, A_VAR: 'x', B_VAR: 'y' },
      encoding: 'utf8',
    });
    expect(out).toBe('');
  });

  it('names every missing variable', () => {
    try {
      execFileSync('bash', [SECRETS, 'A_VAR', 'B_VAR'], {
        env: { ...process.env, A_VAR: 'x', B_VAR: '' },
        encoding: 'utf8',
        stdio: 'pipe',
      });
      throw new Error('expected failure');
    } catch (err) {
      expect(err.stderr.toString()).toContain('Missing secret: B_VAR');
      expect(err.stderr.toString()).not.toContain('Missing secret: A_VAR');
    }
  });
});
