# User Actions Required

Superpowers cannot finish installing without these interactive steps. Run them in your **copilot-cli** session in this order.

## Steps

1. Add the Superpowers marketplace

   ```text
   superpowers marketplace add https://github.com/obra/superpowers
   ```

   Expected result: Marketplace is registered and available

2. Install the Superpowers skill package

   ```text
   superpowers install
   ```

   Expected result: Superpowers skill bundle is installed and available

## Verification

After completing the steps above, run this in your **copilot-cli** session:

```text
Tell me about your superpowers
```

The agent should respond with a description of the bundled skills (brainstorming, writing-plans, using-git-worktrees, test-driven-development, etc.).
