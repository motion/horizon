'use strict';

const auth_utils = require('./utils');

const https = require('https');
const querystring = require('querystring');
const url = require('url');

const Joi = require('joi');

const options_schema = Joi.object().keys({
  path: Joi.string().required(),
  id: Joi.string().required(),
  secret: Joi.string().required(),
  host: Joi.string().required(),
}).unknown(false);

function auth0(horizon, raw_options) {
  const options = Joi.attempt(raw_options, options_schema);
  const client_id = options.id;
  const client_secret = options.secret;
  const host = options.host;


  const make_acquire_url = (state, redirect_uri) =>
    url.format({ protocol: 'https',
                 host: host,
                 pathname: '/authorize',
                 query: { response_type: 'code', client_id, redirect_uri, state } });

  const make_token_request = (code, redirect_uri) => {
    const req = https.request({ method: 'POST', host, path: '/oauth/token',
                                headers: { 'Content-type': 'application/x-www-form-urlencoded' } });
    req.write(querystring.stringify({
      client_id, redirect_uri, client_secret, code,
      grant_type: 'authorization_code',
    }));
    return req;
  };

  const make_inspect_request = (access_token) =>
    https.request({ host, path: '/userinfo',
                    headers: { Authorization: `Bearer ${access_token}` } });

  const extract_id = (user_info) => {
    if (user_info) {
      return {
        user_id: user_info.user_id,
        companies: user_info.user_metadata.companies || [],
      };
    }
    return null;
  };


  auth_utils.oauth2({
    horizon,
    provider: options.path,
    make_acquire_url,
    make_token_request,
    make_inspect_request,
    extract_id,
  });
}

module.exports = auth0;
