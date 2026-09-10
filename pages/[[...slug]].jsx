import LegacyPage from '../components/LegacyPage';
import pages from '../generated/pages.json';

export default LegacyPage;

export function getStaticPaths() {
  return {
    paths: Object.keys(pages).map(route => ({
      params: { slug: route.split('/').filter(Boolean) },
    })),
    fallback: false,
  };
}

export function getStaticProps({ params }) {
  const slug = params?.slug || [];
  const route = slug.length ? `/${slug.join('/')}/` : '/';
  const page = pages[route];
  if (!page) return { notFound: true };
  return { props: { page } };
}
