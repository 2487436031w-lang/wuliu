import pathlib, subprocess, os
root = pathlib.Path(r"c:\Users\Someone\Desktop\Prototype\wuliu-main")
msg = root / ".git" / "MSG.txt"
msg.write_text(
    "docs+feat: refine greenhouse design v1.1 with stacking shade and 3D cues\n\n"
    "Add detailed design (orientation, crop tiers, lamp-bed mapping, external roll shade); "
    "raise benches/sensors/lamps; show plants and shade cloth in Three.js; cite HLS/Blender/UE path.\n",
    encoding="utf-8",
)
env = os.environ.copy()
env["GIT_AUTHOR_NAME"] = "someonehatesmonday"
env["GIT_AUTHOR_EMAIL"] = "Someone-hates-Monday@users.noreply.github.com"
env["GIT_COMMITTER_NAME"] = "someonehatesmonday"
env["GIT_COMMITTER_EMAIL"] = "Someone-hates-Monday@users.noreply.github.com"
subprocess.run(["git", "add", "-A"], cwd=root, check=True)
# unstage secrets if any
subprocess.run(["git", "reset", "HEAD", "--", "**/application-secret.yml", "web/.env.local"], cwd=root)
r = subprocess.run(["git", "commit", "-F", str(msg)], cwd=root, env=env, capture_output=True)
print(r.returncode, r.stdout.decode("utf-8", "replace"), r.stderr.decode("utf-8", "replace"))
print(subprocess.run(["git", "log", "-1", "--format=%h %an %s"], cwd=root, capture_output=True, text=True).stdout)
msg.unlink(missing_ok=True)
