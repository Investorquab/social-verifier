# v1.0.0
# { "Depends": "py-genlayer:test" }

from genlayer import *
import json


class SocialVerifier(gl.Contract):

    verifications:   TreeMap[str, str]
    verified_count:  str
    total_attempts:  str

    def __init__(self) -> None:
        self.verified_count = "0"
        self.total_attempts = "0"

    def _clean(self, raw: str) -> str:
        raw = raw.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:])
        raw = raw.replace("```json", "").replace("```", "").strip()
        return raw

    def _key(self, platform: str, username: str, wallet: str) -> str:
        return platform + ":" + username.lower() + ":" + wallet.lower()

    @gl.public.write
    def verify_twitter(self, username: str, wallet: str) -> str:
        username = username.strip().lstrip("@")
        wallet   = wallet.strip().lower()

        prompt = (
            "You are a social media verification oracle. "
            "Check if the Twitter/X user @" + username + " has posted or listed "
            "the wallet address " + wallet + " anywhere in their profile bio, pinned tweet, or recent tweets. "
            "Search for this information on Twitter/X (https://twitter.com/" + username + " or https://x.com/" + username + "). "
            "Respond with ONLY this JSON on one line, no markdown: "
            "{\"verified\": true, \"platform\": \"twitter\", "
            "\"username\": \"" + username + "\", "
            "\"wallet\": \"" + wallet + "\", "
            "\"found_in\": \"bio\", "
            "\"confidence\": 95, "
            "\"message\": \"Wallet address found in Twitter bio\"}"
        )

        def fetch():
            raw = gl.nondet.exec_prompt(prompt)
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                cleaned = "\n".join(lines[1:])
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
            return cleaned

        result_str = gl.eq_principle.strict_eq(fetch)
        data = json.loads(result_str)

        self.total_attempts = str(int(self.total_attempts) + 1)

        if data.get("verified"):
            key = self._key("twitter", username, wallet)
            self.verifications[key] = result_str
            self.verified_count = str(int(self.verified_count) + 1)

        return json.dumps({
            "success":   True,
            "verified":  data.get("verified", False),
            "platform":  "twitter",
            "username":  username,
            "wallet":    wallet,
            "found_in":  data.get("found_in", ""),
            "confidence": data.get("confidence", 0),
            "message":   data.get("message", ""),
            "verified_by": "GenLayer Consensus",
        })

    @gl.public.write
    def verify_github(self, username: str, wallet: str) -> str:
        username = username.strip()
        wallet   = wallet.strip().lower()

        prompt = (
            "You are a social verification oracle. "
            "Check if the GitHub user " + username + " has listed "
            "the wallet address " + wallet + " anywhere in their GitHub profile bio, "
            "pinned repositories, or README files at https://github.com/" + username + ". "
            "Respond with ONLY this JSON on one line, no markdown: "
            "{\"verified\": true, \"platform\": \"github\", "
            "\"username\": \"" + username + "\", "
            "\"wallet\": \"" + wallet + "\", "
            "\"found_in\": \"profile bio\", "
            "\"confidence\": 95, "
            "\"message\": \"Wallet address found in GitHub profile\"}"
        )

        def fetch():
            raw = gl.nondet.exec_prompt(prompt)
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                cleaned = "\n".join(lines[1:])
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
            return cleaned

        result_str = gl.eq_principle.strict_eq(fetch)
        data = json.loads(result_str)

        self.total_attempts = str(int(self.total_attempts) + 1)

        if data.get("verified"):
            key = self._key("github", username, wallet)
            self.verifications[key] = result_str
            self.verified_count = str(int(self.verified_count) + 1)

        return json.dumps({
            "success":   True,
            "verified":  data.get("verified", False),
            "platform":  "github",
            "username":  username,
            "wallet":    wallet,
            "found_in":  data.get("found_in", ""),
            "confidence": data.get("confidence", 0),
            "message":   data.get("message", ""),
            "verified_by": "GenLayer Consensus",
        })

    @gl.public.write
    def verify_farcaster(self, username: str, wallet: str) -> str:
        username = username.strip()
        wallet   = wallet.strip().lower()

        prompt = (
            "You are a social verification oracle. "
            "Check if the Farcaster user @" + username + " has listed "
            "the wallet address " + wallet + " in their Farcaster profile at "
            "https://warpcast.com/" + username + ". "
            "Farcaster profiles often list connected wallet addresses. "
            "Respond with ONLY this JSON on one line, no markdown: "
            "{\"verified\": true, \"platform\": \"farcaster\", "
            "\"username\": \"" + username + "\", "
            "\"wallet\": \"" + wallet + "\", "
            "\"found_in\": \"connected wallets\", "
            "\"confidence\": 90, "
            "\"message\": \"Wallet address found in Farcaster connected wallets\"}"
        )

        def fetch():
            raw = gl.nondet.exec_prompt(prompt)
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                cleaned = "\n".join(lines[1:])
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
            return cleaned

        result_str = gl.eq_principle.strict_eq(fetch)
        data = json.loads(result_str)

        self.total_attempts = str(int(self.total_attempts) + 1)

        if data.get("verified"):
            key = self._key("farcaster", username, wallet)
            self.verifications[key] = result_str
            self.verified_count = str(int(self.verified_count) + 1)

        return json.dumps({
            "success":   True,
            "verified":  data.get("verified", False),
            "platform":  "farcaster",
            "username":  username,
            "wallet":    wallet,
            "found_in":  data.get("found_in", ""),
            "confidence": data.get("confidence", 0),
            "message":   data.get("message", ""),
            "verified_by": "GenLayer Consensus",
        })

    @gl.public.view
    def check_verification(self, platform: str, username: str, wallet: str) -> dict:
        key = self._key(platform, username.strip(), wallet.strip().lower())
        raw = self.verifications.get(key, "")
        if raw:
            try:
                return {"verified": True, "data": json.loads(raw)}
            except Exception:
                pass
        return {"verified": False, "data": None}

    @gl.public.view
    def get_stats(self) -> dict:
        return {
            "verified_count": int(self.verified_count),
            "total_attempts": int(self.total_attempts),
            "source":         "GenLayer Social Verifier",
            "network":        "GenLayer Studionet",
            "platforms":      ["twitter", "github", "farcaster"],
        }
