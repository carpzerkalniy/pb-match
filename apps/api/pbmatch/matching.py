"""Pure rules. Database transactions, identity and API checks remain to be wired."""

from dataclasses import dataclass
from enum import Enum


class ContactPolicy(Enum):
    # Pending product decision: no disclosure is possible with this policy.
    PENDING = "pending"
    OWNER_GRANT = "owner_grant"
    BOTH_GRANT = "both_grant"


@dataclass(frozen=True)
class Participant:
    id: int
    event_id: int
    attended: bool
    opted_in: bool


def can_like(source: Participant, target: Participant, *, voting_open: bool) -> bool:
    return (
        voting_open
        and source.id != target.id
        and source.event_id == target.event_id
        and source.attended and target.attended
        and source.opted_in and target.opted_in
    )


def is_mutual(source_id: int, target_id: int, likes: set[tuple[int, int]]) -> bool:
    return (source_id != target_id and (source_id, target_id) in likes
            and (target_id, source_id) in likes)


def may_disclose_contact(
    *,
    mutual: bool,
    owner_granted: bool,
    recipient_granted: bool,
    participants_active: bool,
    policy: ContactPolicy = ContactPolicy.PENDING,
) -> bool:
    """Consent is pair-specific and must be loaded server-side, not from a client flag.

    OWNER_GRANT/BOTH_GRANT are candidate policies, not an accepted product choice.
    Callers must check session ownership, blocking and current consent revision.
    """
    if not mutual or not owner_granted or not participants_active:
        return False
    if policy is ContactPolicy.OWNER_GRANT:
        return True
    if policy is ContactPolicy.BOTH_GRANT:
        return recipient_granted
    return False
