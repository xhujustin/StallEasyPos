#!/bin/sh
set -eu

echo "Applying database migrations..."
alembic upgrade head
python scripts/check_db.py

if [ "${SEED_INITIAL_DATA:-true}" = "true" ]; then
  echo "Creating initial users and store..."
  python -m app.initial_data
fi

if [ "${SETUP_DEFAULT_CREDENTIALS:-true}" = "true" ]; then
  echo "Applying default accounts and store PINs..."
  python scripts/setup_defaults.py
fi

if [ "${SEED_SAMPLE_PRODUCTS:-false}" = "true" ]; then
  echo "Creating sample products..."
  python -m app.seed_products
fi

exec "$@"
