# Running the tests

Setup is already done. You don't need to install anything.

## The one command

Open a terminal in this folder and run:

```bash
npm run check
```

Run it after every change.

- ✅ All green: you're good.
- ❌ Red: read the first error. It names the file and line.

## Optional: auto re-run

```bash
npm run test:watch
```

Leave this open. It re-runs the tests every time you save.
Press `q` to stop.

## If something breaks

Only if it complains about missing packages:

```bash
npm install
```

Then run `npm run check` again.
