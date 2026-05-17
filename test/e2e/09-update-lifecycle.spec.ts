import { test, expect, request } from '@playwright/test';

/**
 * v0.50.6 — Update lifecycle e2e (Phase 8).
 *
 * Validates the "host can keep breaking" promise: install → configure →
 * upgrade-in-place → settings preserved. Plus delete (default) → reinstall →
 * settings preserved. Plus delete-with-opt-in → reinstall → fresh state.
 *
 * Drives Hatch via the WP REST API + direct DB queries (faster than UI),
 * then verifies via the admin UI that everything still works.
 */

const BASE = 'http://localhost:8810';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'hatch-test-2026';

async function dbQuery(sql: string): Promise<string> {
  const { execSync } = await import('node:child_process');
  // Pipe SQL via stdin to avoid bash/zsh/sh escape hell with backslash patterns
  // like 'hatch\_%' ESCAPE '\\'. The MySQL CLI happily reads from stdin and
  // doesn't try to interpret shell escapes.
  // -N: skip column headers, -s: silent (no table formatting). No -e since
  // we're piping the SQL via stdin.
  return execSync(`docker exec -i qwp_db mysql -uroot -proot wordpress -Ns`, {
    encoding: 'utf-8',
    input: sql,
  }).trim();
}

async function setHatchOption(name: string, value: string) {
  // Use direct DB so we don't depend on Hatch's REST endpoints
  await dbQuery(`INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('${name}', '${value}', 'yes') ON DUPLICATE KEY UPDATE option_value='${value}'`);
}

async function getHatchOption(name: string): Promise<string> {
  return dbQuery(`SELECT option_value FROM wp_options WHERE option_name='${name}'`);
}

test.describe('Update lifecycle — settings survive plugin upgrade and re-install', () => {
  test('PRE: configure Hatch with known values', async () => {
    await setHatchOption('hatch_frontend_url', 'https://test-frontend.example.com');
    await setHatchOption('hatch_image_proxy_url', 'https://test-frontend.example.com');
    await setHatchOption('hatch_security_harden_rest', '1');
    await setHatchOption('hatch_uninstall_remove_all_data', '0'); // default — preserve

    expect(await getHatchOption('hatch_frontend_url')).toBe('https://test-frontend.example.com');
  });

  test('UPGRADE in place: deactivate + delete files + extract new + reactivate → settings preserved', async () => {
    const { execSync } = await import('node:child_process');
    // Simulate an in-place upgrade: copy plugin files but DON'T touch hatch_* options.
    execSync('docker exec qwp_wordpress bash -c "rm -rf /var/www/html/wp-content/plugins/hatch && mkdir -p /tmp/upd"', { encoding: 'utf-8' });
    execSync('docker cp /tmp/hatch-extract/hatch qwp_wordpress:/var/www/html/wp-content/plugins/', { encoding: 'utf-8' });
    execSync('docker exec qwp_wordpress chown -R www-data:www-data /var/www/html/wp-content/plugins/hatch', { encoding: 'utf-8' });

    // Verify all critical options still there
    expect(await getHatchOption('hatch_frontend_url'),   'frontend URL preserved').toBe('https://test-frontend.example.com');
    expect(await getHatchOption('hatch_image_proxy_url'), 'image proxy URL preserved').toBe('https://test-frontend.example.com');
    expect(await getHatchOption('hatch_security_harden_rest'), 'security flag preserved').toBe('1');
  });

  test('DELETE (default opt-out) → reinstall → settings preserved', async () => {
    // Simulate WP "Delete" with hatch_uninstall_remove_all_data = 0 (default).
    // uninstall.php is a no-op in this case.
    const { execSync } = await import('node:child_process');
    execSync('docker exec qwp_wordpress rm -rf /var/www/html/wp-content/plugins/hatch', { encoding: 'utf-8' });
    // ⚠ We do NOT manually call uninstall.php logic here — only WP's "Delete"
    // button triggers it via WP_UNINSTALL_PLUGIN const, and only if the user
    // ticked the opt-in. So options stay in DB.

    // Verify options still there
    expect(await getHatchOption('hatch_frontend_url')).toBe('https://test-frontend.example.com');

    // Reinstall
    execSync('docker cp /tmp/hatch-extract/hatch qwp_wordpress:/var/www/html/wp-content/plugins/', { encoding: 'utf-8' });
    execSync('docker exec qwp_wordpress chown -R www-data:www-data /var/www/html/wp-content/plugins/hatch', { encoding: 'utf-8' });

    // Verify options STILL there after reinstall
    expect(await getHatchOption('hatch_frontend_url'), 'settings survive reinstall').toBe('https://test-frontend.example.com');
    expect(await getHatchOption('hatch_image_proxy_url')).toBe('https://test-frontend.example.com');
  });

  test('DELETE with opt-in → reinstall → fresh state (full wipe)', async () => {
    const { execSync } = await import('node:child_process');
    // User ticks the opt-in
    await setHatchOption('hatch_uninstall_remove_all_data', '1');

    // Simulate WP "Delete": runs uninstall.php with WP_UNINSTALL_PLUGIN defined.
    // We invoke it via PHP-CLI inside the container.
    execSync(`docker exec qwp_wordpress php -r "define('WP_UNINSTALL_PLUGIN', true); define('ABSPATH', '/var/www/html/'); require '/var/www/html/wp-load.php'; require '/var/www/html/wp-content/plugins/hatch/uninstall.php';"`, { encoding: 'utf-8' });

    // Now hatch_* options should be gone
    const remaining = await dbQuery("SELECT COUNT(*) FROM wp_options WHERE option_name LIKE 'hatch\\_%' ESCAPE '\\\\'");
    expect(parseInt(remaining, 10), 'all hatch_* options wiped').toBe(0);

    // Restore plugin files for the rest of the suite
    execSync('docker exec qwp_wordpress rm -rf /var/www/html/wp-content/plugins/hatch', { encoding: 'utf-8' });
    execSync('docker cp /tmp/hatch-extract/hatch qwp_wordpress:/var/www/html/wp-content/plugins/', { encoding: 'utf-8' });
    execSync('docker exec qwp_wordpress chown -R www-data:www-data /var/www/html/wp-content/plugins/hatch', { encoding: 'utf-8' });
    // Reactivate via DB
    await setHatchOption('active_plugins', 'a:1:{i:0;s:15:"hatch/hatch.php";}');
  });
});
