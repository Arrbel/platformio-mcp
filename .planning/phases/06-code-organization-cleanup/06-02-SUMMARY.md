# 06-02 Summary

## Outcome

- Introduced `executeUploadRun()` in `src/tools/upload.ts`.
- Routed both `uploadFirmware()` and `uploadAndMonitor()` through the shared helper.
- Removed duplicated validation, environment resolution, target arg construction, execution, and result shaping logic.

## Files Changed

- `src/tools/upload.ts`

## Verification

- `npm test -- --run tests/port-resolution.test.ts tests/phase-a-semantics.test.ts`
- `npx tsc --noEmit`

## Notes

- Public upload function signatures remain unchanged.
