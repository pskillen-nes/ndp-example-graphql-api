import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {ApolloClient, ApolloProvider, InMemoryCache} from "@apollo/client";

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'

import App from './App.tsx'
import config from "./config.ts";


// Create the Apollo Client
const client = new ApolloClient({
  uri: window.location.origin.includes('localhost')
    ? config.graphql.localEndpoint
    : config.graphql.remoteEndpoint,
  cache: new InMemoryCache(),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <App/>
    </ApolloProvider>
  </StrictMode>,
)
