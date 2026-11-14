export function createAnimation() {
  hmUI.createWidget(hmUI.widget.IMG_ANIM, {
    x: 179, y: 421,
    anim_path: 'images/animation', anim_prefix: 'pulse', anim_ext: 'png',
    anim_fps: 4, anim_size: 8,
    repeat_count: 1, anim_repeat: false,
    anim_status: hmUI.anim_status.START,
    display_on_restart: true,
    show_level: hmUI.show_level.ONLY_NORMAL
  })
}
