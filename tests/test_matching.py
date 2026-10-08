from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))
from pbmatch.matching import ContactPolicy, Participant, can_like, is_mutual, may_disclose_contact


class MatchingTests(unittest.TestCase):
    def test_only_active_participants_in_same_event_can_like(self):
        source = Participant(1, 10, True, True)
        self.assertTrue(can_like(source, Participant(2, 10, True, True), voting_open=True))
        for target in (source, Participant(2, 11, True, True), Participant(2, 10, False, True),
                       Participant(2, 10, True, False)):
            self.assertFalse(can_like(source, target, voting_open=True))
        self.assertFalse(can_like(source, Participant(2, 10, True, True), voting_open=False))

    def test_one_way_like_is_not_a_match(self):
        self.assertFalse(is_mutual(1, 2, {(1, 2)}))
        self.assertTrue(is_mutual(1, 2, {(1, 2), (2, 1)}))
        self.assertFalse(is_mutual(1, 1, {(1, 1)}))

    def test_contact_is_closed_before_product_policy_is_selected(self):
        self.assertFalse(may_disclose_contact(mutual=True, owner_granted=True,
                                             recipient_granted=True, participants_active=True))

    def test_every_candidate_policy_requires_owner_consent_and_mutuality(self):
        for policy in ContactPolicy:
            for mutual, owner, active in ((False, True, True), (True, False, True), (True, True, False)):
                with self.subTest(policy=policy, mutual=mutual, owner=owner, active=active):
                    self.assertFalse(may_disclose_contact(mutual=mutual, owner_granted=owner,
                        recipient_granted=True, participants_active=active, policy=policy))

    def test_candidate_both_consent_policy(self):
        self.assertFalse(may_disclose_contact(mutual=True, owner_granted=True,
            recipient_granted=False, participants_active=True, policy=ContactPolicy.BOTH_GRANT))
        self.assertTrue(may_disclose_contact(mutual=True, owner_granted=True,
            recipient_granted=True, participants_active=True, policy=ContactPolicy.BOTH_GRANT))


if __name__ == "__main__":
    unittest.main()
