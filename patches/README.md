# Hermes Agent Patches

Targeted fixes applied on top of the upstream `hermes-agent` PyPI release
into the bundled venv. Applied automatically by
`scripts/apply-hermes-patches.mjs` after `install-hermes.mjs`.

Each patch is **idempotent** — re-running the script after the patch is
already in place is a no-op.

## Active patches against hermes-agent 0.14.0 + dingtalk-stream 0.24.x

| ID | File | Fix |
|----|------|-----|
| dt-pre-start | `gateway/platforms/dingtalk.py` | Add `_IncomingHandler.pre_start()` so `dingtalk_stream.DingTalkStreamClient.start()` (>= 0.24) doesn't raise `AttributeError` on connect |
| dt-card-tpl-env | `gateway/platforms/dingtalk.py` | Fall back to `DINGTALK_CARD_TEMPLATE_ID` env var when `extra.card_template_id` is unset |
| dt-card-before-webhook | `gateway/platforms/dingtalk.py` | Try AI Card before validating `session_webhook` — Card SDK does not need a webhook URL |
| dt-dm-robot-code | `gateway/platforms/dingtalk.py` | Pass `robot_code` in DM `DeliverCardRequestImRobotOpenDeliverModel` (one of two flags needed for wide-screen) |
| dt-card-autolayout | `gateway/platforms/dingtalk.py` | Inject `sys_full_json_obj={"config":{"autoLayout":true}}` so AI Cards render full-width on PC |

When upstream `hermes-agent` releases include any of these fixes, drop the
corresponding entry from `apply-hermes-patches.mjs`.
