-- Integration secrets set from the studio, encrypted with CONFIG_ENC_KEY. The effective value is
-- applied to the process environment at boot; an environment variable set by the deployment wins.
CREATE TABLE config_secrets (
  key         text PRIMARY KEY,
  ciphertext  text NOT NULL,
  nonce       text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);
