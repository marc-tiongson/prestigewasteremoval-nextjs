/**
 * Trusted, repository-owned export markup only. Keep the original DOM intact:
 * Elementor and Astra use its classes and data attributes to initialize widgets.
 * Native anchors intentionally reload the document to reset their page lifecycle.
 */
export default function LegacyPage({ page }) {
  return <div id="prestige-site" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: page.body }} />;
}
