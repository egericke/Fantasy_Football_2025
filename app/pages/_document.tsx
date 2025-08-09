import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from 'next/document';

// Ant Design v5 ships its styles through a CSS‑in‑JS solution.  In a
// server‑rendered environment like Next.js we need to collect those styles
// during the initial render and inject them into the document head.  Without
// this step the first paint will render Ant Design components without any
// styling, leading to a flash of unstyled content (FOUC) during static
// exports.  The createCache, extractStyle and StyleProvider utilities are
// provided by the `@ant-design/cssinjs` package.  See the Next.js usage
// guide for details:
// https://ant.design/docs/react/use-with-next/
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';

/**
 * Custom Document class responsible for rendering the overall HTML document.
 * Here we override `getInitialProps` to collect Ant Design styles on the
 * server.  The collected styles are then injected into the `<Head>`
 * element via the returned `styles` property.
 */
export default class MyDocument extends Document {
  /**
   * Collect styles generated during the initial server render.  This method
   * runs on the server when Next.js renders a page for the first time.  We
   * wrap the App component with a `StyleProvider` so that all CSS‑in‑JS
   * styles from Ant Design are captured in the provided cache.  After the
   * render, `extractStyle` converts the cache into a CSS string which we
   * insert into the document head.  See the Ant Design docs for more
   * information.
   */
  static async getInitialProps(
    ctx: DocumentContext,
  ): Promise<DocumentInitialProps & { styles: JSX.Element }> {
    // Create a new cache for each request to avoid global leakage.
    const cache = createCache();
    const originalRenderPage = ctx.renderPage;

    // Override renderPage to wrap the application with the StyleProvider.
    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App: any) => (props: any) => (
          <StyleProvider cache={cache} hashPriority="high">
            <App {...props} />
          </StyleProvider>
        ),
      });

    // Call the parent class's getInitialProps.
    const initialProps = await Document.getInitialProps(ctx);
    // Extract the collected CSS as a string.
    const styleText = extractStyle(cache, true);
    return {
      ...initialProps,
      // Concatenate any existing styles with the extracted Ant Design styles.
      styles: (
        <>
          {initialProps.styles}
          <style
            id="antd-server-side"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: styleText }}
          />
        </>
      ),
    };
  }

  render() {
    return (
      <Html>
        <Head>
          {/* Document meta information */}
          <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
          <meta name="theme-color" content="#000000" />
          <meta
            name="description"
            content="A free Fantasy Football Draft Assistant with rankings and pick recommendations"
          />
          <meta
            name="keywords"
            content="fantasy,football,ranking,picks,rosters,scoring,projections,assistant,wizard,help"
          />

          {/* Favicon and fonts */}
          <link rel="shortcut icon" href="fb.ico" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Lato:100,300,400,700,900"
          />

          {/* Global site tag (gtag.js) - Google Analytics */}
          <script
            async
            src="https://www.googletagmanager.com/gtag/js?id=UA-108371876-3"
          />
          <script
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
                     function gtag(){dataLayer.push(arguments);}
                     gtag('js', new Date());
                     gtag('config', 'UA-108371876-3');`,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}