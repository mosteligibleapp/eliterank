/**
 * AdminPage - Redirect to separate admin app
 *
 * The admin dashboard has been moved to a separate Vite app.
 * This component redirects old bookmarks and in-app references
 * to the new standalone admin app at /admin/.
 */

import React, { useEffect } from 'react';

export default function AdminPage() {
  useEffect(() => {
    window.location.href = '/admin/';
  }, []);

  return null;
}
