import Document, { Html, Head, Main, NextScript } from 'next/document';
import parse, { attributesToProps } from 'html-react-parser';

export default class SiteDocument extends Document {
  static async getInitialProps(ctx) {
    let page;
    const renderPage = ctx.renderPage;
    ctx.renderPage = () => renderPage({
      enhanceApp: App => function CapturePage(props) {
        page = props.pageProps.page;
        return <App {...props} />;
      },
    });
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps, page };
  }

  render() {
    const page = this.props.page;
    return (
      <Html lang="en-US" prefix="og: https://ogp.me/ns#">
        <Head>
          {page && parse(page.head)}
          <style>{'#__next { display: contents; }'}</style>
        </Head>
        <body {...attributesToProps(page?.bodyAttributes || {})}>
          <Main />
          {page && parse(page.scripts)}
          <NextScript />
        </body>
      </Html>
    );
  }
}
