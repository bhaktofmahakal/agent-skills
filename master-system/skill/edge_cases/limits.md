# Resource Limits Edge Cases

## File Too Large or Binary

- Detection: Read tool hits size limit or non-text content
- Recovery: Return metadata and truncated/binary notice

## Shell Command Timeout

- Detection: Elapsed time exceeds timeout_ms
- Recovery: Kill process, persist timeout metadata, return tool error

## Message Too Long

- Detection: Message parts exceed max size
- Recovery: Truncate with explicit marker

## Session Limit Reached

- Detection: Max concurrent sessions reached
- Recovery: Queue or reject new sessions

## Token Budget Exhausted

- Detection: Estimated tokens exceed provider window
- Recovery: Trigger compaction before request
