import pathlib, subprocess, os
root = pathlib.Path(r"c:\Users\Someone\Desktop\Prototype\wuliu-main")
msg = root / ".git" / "MSG.txt"
msg.write_text(
    "feat: per-bed lamps/sensors, stacked crops, sun vector and stronger heatmap\n\n"
    "Align every bed with east-west fixtures and PAR; dual-tier dendrobium racks; "
    "expose solar elevation/azimuth and drive Three.js sun arrow plus PPFD legend.\n",
    encoding="utf-8",
)
env = os.environ.copy()
env.update(
    GIT_AUTHOR_NAME="someonehatesmonday",
    GIT_AUTHOR_EMAIL="Someone-hates-Monday@users.noreply.github.com",
    GIT_COMMITTER_NAME="someonehatesmonday",
    GIT_COMMITTER_EMAIL="Someone-hates-Monday@users.noreply.github.com",
)
subprocess.run(["git", "add", "-A"], cwd=root, check=True)
subprocess.run(["git", "commit", "-F", str(msg)], cwd=root, env=env, check=True)
msg.unlink(missing_ok=True)
print(subprocess.run(["git", "log", "-1", "--format=%h %an %s"], cwd=root, capture_output=True, text=True).stdout)
