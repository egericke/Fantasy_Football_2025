import { initStore } from 'lib/store/actions/players';
import { persistor, store } from 'lib/store/store';
import Head from 'next/head';
import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

// Import the global stylesheet for our application.  In development the styles
// from `styles.css` are injected automatically; however during a production
// build Next.js will extract and reorder CSS.  Importing the file at the
// top level of the custom App component ensures the rules are applied before
// any component renders.
import './styles.css';

// Ant Design v5 no longer ships a full CSS bundle like in v4.  Instead it
// provides a minimal reset file which normalises browser styles and applies
// sensible defaults for typography, margins and form controls.  Without
// explicitly importing this file Ant Design components will render without
// any base styling when the app is statically exported.  See the v4→v5
// migration guide for details:
// https://ant.design/docs/react/migration-v5#technology-adjustment
import 'antd/dist/reset.css';
import { IPlayer } from 'lib/models/Player';

if (typeof window !== 'undefined') {
  // When the window finishes loading, attempt to retrieve updated projections
  // from the `projections.json` endpoint.  Using `fetch` over the old
  // XMLHttpRequest API improves readability and returns promises for
  // straightforward error handling.  Only perform a sync if the last
  // successful sync was more than 12 hours ago.
  window.onload = () => {
    const { lastSync, lastSyncPlayers, players } = store.getState();
    const twelveHours = 1000 * 60 * 60 * 12;
    if (players.length && lastSyncPlayers.length && lastSync > 0 && Date.now() - lastSync < twelveHours) {
      return;
    }

    fetch('/projections.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load projections: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((playerDataArray) => {
        let players = (playerDataArray.data as IPlayer[]) || [];

        // tableName returns an abbreviated player name that fits in the cards and rows
        const tableName = (name: string) => `${name[0]}. ${name.split(' ')[1]}`;
        const positions = new Set(['QB', 'RB', 'WR', 'TE', 'DST', 'K']);
        players = players
          .map((p) => ({
            ...p,
            tableName: p.pos === 'DST' ? p.name : tableName(p.name),
          }))
          .filter((p) => positions.has(p.pos));

        store.dispatch(initStore(players));
      })
      .catch((err) => {
        console.warn(err);
      });
  };
}

export default ({ Component, pageProps }: { Component: any; pageProps: any }) => (
  <>
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
    </Head>
    {/* @ts-ignore */}
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Component {...pageProps} />
      </PersistGate>
    </Provider>
  </>
);
