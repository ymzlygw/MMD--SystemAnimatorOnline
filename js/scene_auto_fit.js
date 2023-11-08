// auto fit
// (2023-11-09)

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const v4 = new THREE.Vector3();
const v5 = new THREE.Vector3();
const v6 = new THREE.Vector3();

const ref_pt = new THREE.Vector3();
const ref_pt_core = new THREE.Vector3();
const ref_pt_shift = new THREE.Vector3();

const q1 = new THREE.Quaternion();

function auto_fit_core() {
  function transform_contact_point(v, depth_v, af_motion_para) {
    rotation_offset = (af.rotation) ? v5.copy(af.rotation).multiplyScalar(Math.PI/180) : v5.set(0,0,0);

    if (af_motion_para) {
      const depth_y = depth_v.y;
      depth_v.setY(0);
      if (af_motion_para.rotation) {
        rotation_offset.add(v4.copy(af_motion_para.rotation).multiplyScalar(Math.PI/180));
        depth_v.applyEuler(v4);
      }
      if (af_motion_para.depth_rotation) {
        depth_v.applyEuler(v4.copy(af_motion_para.depth_rotation).multiplyScalar(Math.PI/180));
      }
      if (af_motion_para.depth_scale) {
        depth_v.multiplyScalar(af_motion_para.depth_scale);
      }
      depth_v.setY(depth_y);
    }
//DEBUG_show('\nDepth:\n'+depth_v.toArray().join('\n')+'\n',0,1)

    ref_pt_core.copy(v).multiply(object_3d._mesh.scale);
    ref_pt_core.y -= get_ground_y();
    ref_pt_core.applyQuaternion(object_3d._mesh.quaternion);

    if (!af.transform_avatar)
      ref_pt_core.applyEuler(rotation_offset);
    ref_pt_shift.copy(object_3d._mesh.position).sub(model_position0).add(depth_v);
    v.copy(ref_pt_core).add(ref_pt_shift);
//DEBUG_show('\nref_pt_core:\n'+ref_pt_core.toArray().join('\n')+'\n',0,1)
//DEBUG_show('\nref_pt_shift:\n'+ref_pt_shift.toArray().join('\n')+'\n',0,1)
//DEBUG_show('\nv:\n'+v.toArray().join('\n')+'\n',0,1)
    ref_pt.copy(v);
    return v;
  }

  function get_ground_y() {
    return (af.ground_y) ? af.ground_y * object_3d._mesh.scale.y + object_3d._mesh.position.y : 0;
  }

  let scale_offset, position_offset, rotation_offset;
  let position_offset_y_ignored = false;

  if (af.motion_target) {
    if (af.motion_target.indexOf(MMD_SA.MMD.motionManager.filename) == -1)
      return false;
  }

  if (af.range) {
    v1.copy(af.reference_point).multiply(object_3d._mesh.scale).add(object_3d._mesh.position);
    if (v1.distanceTo(model.mesh.position) > af.range)
      return false;
  }

  rotation_offset = v5.set(0,0,0);

  if (type == 'chair') {
//    if (!System._browser.camera.poseNet.enabled) return;
    if (!motion_para.motion_tracking_upper_body_only) return false;

    const legL = model.get_bone_position_by_MMD_name('左足', true);
    const hip = v1.copy(legL).add(model.get_bone_position_by_MMD_name('右足', true).sub(legL).multiplyScalar(0.5));

    const legL0 = model.get_bone_origin_by_MMD_name('左足');
    const af_motion_para = motion_para.auto_fit?.chair;
    if (!af_motion_para) {
      const leg_angle = Math.min(Math.abs(model.get_bone_by_MMD_name('左足').quaternion.toAxisAngle()[1]), Math.abs(model.get_bone_by_MMD_name('右足').quaternion.toAxisAngle()[1]));
      if (leg_angle < Math.PI/4) return false;
      if ((hip.y > legL0[1]*2/3) || (hip.y < legL0[1]*0.4)) return false;
    }

    const thigh_thickness = legL0[1]/10;

    const upper_leg_length = v3.fromArray(legL0).distanceTo(v4.fromArray(model.get_bone_origin_by_MMD_name('左ひざ')));
    const depth_v = v3.set(0, 0, -upper_leg_length/2);

    const ankle_y = Math.min(model.get_bone_position_by_MMD_name('左ひざ', true).y, model.get_bone_position_by_MMD_name('右ひざ', true).y);
    const hip_offset = (hip.y - ankle_y) - 0.1;
//DEBUG_show(hip_offset,0,1)
    if (hip_offset > 0) {
      depth_v.y += Math.min(hip_offset/2, thigh_thickness/2);
      depth_v.z += Math.min(hip_offset*2, upper_leg_length/3);
    }

    transform_contact_point(v2.copy(af.reference_point), depth_v, af_motion_para);

    const hip_y = hip.y - thigh_thickness;
    if (af.scale) {
      scale_offset = af.scale;
    }
    else {
      scale_offset = hip_y/ref_pt.y;
      position_offset_y_ignored = true;
    }
    position_offset = v3.copy(hip);
  }
  else if (type == 'floor') {
//    if (!System._browser.camera.poseNet.enabled) return;
    if (!motion_para.motion_tracking_upper_body_only) return false;

    const legL = model.get_bone_position_by_MMD_name('左足', true);
    const hip = v1.copy(legL).add(model.get_bone_position_by_MMD_name('右足', true).sub(legL).multiplyScalar(0.5));

    const legL0 = model.get_bone_origin_by_MMD_name('左足');
    if (hip.y > legL0[1]*0.4) return false;

    const thigh_thickness = legL0[1]/10;

    transform_contact_point(v2.copy(af.reference_point), v3.set(0,0,0));

    hip.y -= thigh_thickness;
    scale_offset = 1;
    position_offset = v3.copy(hip);
  }
  else if (type == 'table') {
//    if (!System._browser.camera.poseNet.enabled) return;
    if (!motion_para.motion_tracking_upper_body_only) return false;

    const af_motion_para = motion_para.auto_fit?.table;
    if (!af_motion_para) {
      if (!motion_para.motion_tracking?.arm_tracking?.elbow_lock) return false;
      if (!!motion_para.motion_tracking.arm_tracking.elbow_lock.left ^ !!motion_para.motion_tracking.arm_tracking.elbow_lock.right) return false;
    }

    const ref_bones = af_motion_para?.reference_bones || ['左ひじ', '右ひじ'];
    const pos = v1.set(0,0,0);
    let contact_y = 9999;
    ref_bones.forEach(b=>{
      const p = model.get_bone_position_by_MMD_name(b, true);
      contact_y = Math.min(p.y, contact_y);
      pos.add(p.multiplyScalar(1/ref_bones.length));
    });
    if (ref_bones.length > 1)
      pos.x = 0;

    const is_arm = ['手','ひじ'].some(b=>ref_bones[0].indexOf(b)!=-1);

    const ref_depth_bones = (is_arm) ? ['左ひじ', '左手首'] : ['左ひざ', '左足'];
    const ref_depth = v3.fromArray(model.get_bone_origin_by_MMD_name(ref_depth_bones[0])).distanceTo(v4.fromArray(model.get_bone_origin_by_MMD_name(ref_depth_bones[1])));

    const depth_v = v3.set(0, 0, ref_depth/2);
    transform_contact_point(v2.copy(af.reference_point), depth_v, af_motion_para);

    const pos_y = contact_y - ref_depth/8;
    scale_offset = pos_y/ref_pt.y;
    position_offset = v3.copy(pos);
    position_offset_y_ignored = true;
  }
  else {
    if (af.reference_point) {
      transform_contact_point(v2.copy(af.reference_point), v3.set(0,0,0));
    }
    else {
      ref_pt_core.set(0,0,0);
      ref_pt_shift.set(0,0,0);
    }

    scale_offset = 1;
    position_offset = v3.set(0,0,0);
  }

//DEBUG_show(type+'/'+Date.now())
//DEBUG_show(scale_offset,0,1)
  const _scale_offset = scale_offset;
  if (af.transform_avatar) scale_offset = 1;

  position_offset.add(model_position_offset).sub(v4.copy(ref_pt_core).multiplyScalar(scale_offset)).sub(v4.copy(ref_pt_shift));
  if (position_offset_y_ignored)
    position_offset.setY(0);

  if (af.position)
    position_offset.add(af.position);

  const mesh0_pos = v6.copy(object_3d._mesh.position).sub(model_position0);

  const q_offset = q1.setFromEuler(rotation_offset);

  if ((explorer_mode_locked == null) && !MMD_SA_options.Dungeon_options.character_movement_disabled)
    explorer_mode_locked = true;

  const transform_list = (af.global_transform) ? MMD_SA.THREEX._object3d_list_ : [object_3d];
  transform_list.forEach(obj=>{
    if (obj.parent_bone?.attached) return;
    if (obj.parent_bone && obj._on_gesture) return;

    const mesh_pos = v2.copy(obj._mesh.position).sub(model_position0);
    const _position_offset = v1.copy(position_offset);
    if (obj != object_3d) {
      _position_offset.add(v4.copy(mesh_pos).sub(mesh0_pos).multiplyScalar(scale_offset).applyQuaternion(q_offset)).sub(mesh_pos).add(mesh0_pos);
    }

    if (af.transform_avatar) {
      hip_y_offset = (af.reference_point) ? (1-_scale_offset) * ref_pt.y : 0;
      if ((hip_y_offset < 0) && !MMD_SA.MMD.motionManager.para_SA.has_leg_IK) {
        height_offset_by_bone.push({ bone:{'左足ＩＫ':1, '右足ＩＫ':1}, scale:-hip_y_offset });
      }

      const c = MMD_SA_options.Dungeon.character;
      c.pos.sub(_position_offset);
      c.pos.y = ((position_offset_y_ignored) ? 0 : c.pos.y) + get_ground_y();
      MMD_SA_options.Dungeon.para_by_grid_id[2].ground_y = c.pos.y;

      c.about_turn = false;
      c.rot.copy(rotation_offset);
      THREE.MMD.getModels()[0].mesh.quaternion.copy(q_offset);

      c.pos_update();
//DEBUG_show(c.pos.toArray().join('\n')+'\n\n'+hip_y_offset+'\n'+_scale_offset);
      return;
    }

    obj.user_data._default_state_.position.add(_position_offset);
    obj.user_data._default_state_.scale *= scale_offset;
    obj._mesh.position.add(_position_offset);
    obj._mesh.scale.multiplyScalar(scale_offset);

    for (const d of ['x','y','z'])
      obj.user_data._rotation_[d] += rotation_offset[d];
    obj._mesh.quaternion.multiply(q_offset);

    if (!obj.user_data._auto_fit_)
      obj.user_data._auto_fit_ = {};
    obj.user_data._auto_fit_.position_offset = (obj.user_data._auto_fit_.position_offset||new THREE.Vector3()).add(_position_offset);
    obj.user_data._auto_fit_.rotation_offset = (obj.user_data._auto_fit_.rotation_offset||new THREE.Vector3()).add(rotation_offset);
    obj.user_data._auto_fit_.scale_offset = (obj.user_data._auto_fit_.scale_offset||1) * scale_offset;

    if (af.global_transform)
      obj.user_data._auto_fit_.global_transform = true;
  });

  if (af.height_offset_by_bone) {
    height_offset_by_bone.push({ bone:af.height_offset_by_bone, scale:object_3d._mesh.scale.y * scale_offset })
  }

  if (af.center_view || af.center_view_lookAt) {
    if (af.center_view) {
      af._center_view_ = [MMD_SA.MMD.motionManager.filename, motion_para.center_view];
      motion_para.center_view = af.center_view;
    }
    if (af.center_view_lookAt) {
      af._center_view_lookAt_ = [MMD_SA.MMD.motionManager.filename, motion_para.center_view_lookAt];
      motion_para.center_view_lookAt = af.center_view_lookAt;
    }
    MMD_SA.reset_camera();
  }

  return true;
}

function auto_fit_loop(obj) {
  obj_para = obj;

  object_3d = MMD_SA.THREEX._object3d_list_.find(obj=>obj.uuid==obj_para._object3d_uuid);
  if (!object_3d) return;

  model_para = obj_para.model_para;
  placement = model_para.placement;
  af = obj_para.auto_fit;
  if (!af) return;

  type = af.type;

  const fitted = auto_fit_core();

  if (fitted && af.transform_avatar) {
    if (explorer_mode_locked) {
      System._browser.on_animation_update.add(()=>{
        MMD_SA_options.Dungeon_options.character_movement_disabled = true;
      }, 0,0);

      MMD_SA_options.Dungeon_options.camera_position_z_sign = 1;
      MMD_SA_options.Dungeon.update_camera_position_base();
      MMD_SA_options.Dungeon.no_collision = true;
      window.removeEventListener('SA_keydown', restore_explorer_mode);
      window.addEventListener('SA_keydown', restore_explorer_mode);
    }

    MMD_SA.reset_camera();
  }

  let visible;
  const ev = (fitted) ? af.on_fit : af.on_unfit;

  if (ev?.hide_object) {
    af._hidden_ = [];
    ev.hide_object.forEach(id=>{
      const _obj = para.json.XR_Animator_scene.object3D_list.find(obj=>obj.id==id);
      if (!_obj) return;

      const obj_3d = MMD_SA.THREEX._object3d_list_.find(obj=>obj.uuid==_obj._object3d_uuid);
      if (!obj_3d) return;

      af._hidden_.push(obj_3d.uuid);
      obj_3d._obj_proxy.hidden = true;
    });
  }

  object_3d._obj_proxy.hidden = af._hidden_ = (ev?.visible === false);

  return fitted;
}

function auto_fit(list) {
  model = MMD_SA.THREEX.get_model(0);
  model_position0 = MMD_SA_options.Dungeon_options.options_by_area_id[MMD_SA_options.Dungeon.area_id]._startup_position_;
  model_position_offset.copy(model.mesh.position).sub(model_position0);
  motion_para = MMD_SA.MMD.motionManager.para_SA;

  if (!list) {
    para.json.XR_Animator_scene.object3D_list.forEach(obj_para=>{
      af = obj_para.auto_fit;
      if (!af) return;

      if (af._hidden_ != null) {
        MMD_SA.THREEX._object3d_list_.find(obj=>obj.uuid==obj_para._object3d_uuid)._obj_proxy.hidden = !af._hidden_;
        delete af._hidden_;
      }
      if (af._center_view_) {
        MMD_SA_options.motion_para[af._center_view_[0]].center_view = af._center_view_[1];
        delete af._center_view_;
      }
      if (af._center_view_lookAt_) {
        MMD_SA_options.motion_para[af._center_view_lookAt_[0]].center_view_lookAt = af._center_view_lookAt_[1];
        delete af._center_view_lookAt_;
      }

      object_3d = MMD_SA.THREEX._object3d_list_.find(obj=>obj.uuid==obj_para._object3d_uuid);

      const transform_list = (af.global_transform) ? MMD_SA.THREEX._object3d_list_ : [object_3d];
      transform_list.forEach(obj=>{
        if (obj.parent_bone?.attached) return;

        const _af_ = obj.user_data._auto_fit_;
        if (!_af_) return;

        obj.user_data._default_state_.position.sub(_af_.position_offset);
        obj.user_data._default_state_.scale /= _af_.scale_offset;
        obj._mesh.position.sub(_af_.position_offset);
        obj._mesh.scale.multiplyScalar(1/_af_.scale_offset);

        for (const d of ['x','y','z'])
          obj.user_data._rotation_[d] -= _af_.rotation_offset[d];
        obj._mesh.quaternion.multiply(q1.setFromEuler(_af_.rotation_offset).conjugate());

        delete obj.user_data._auto_fit_;
      });
    });

    if (para.json.XR_Animator_scene.auto_fit_list) {
      para.json.XR_Animator_scene.auto_fit_list.some(af_list=>{
        let _fitted;
        af_list.some(af=>{
          const obj = para.json.XR_Animator_scene.object3D_list.find(obj=>obj.id==af.object_id);

          obj.auto_fit = Object.assign({}, af);

          const fitted = auto_fit_loop(obj);
          _fitted = _fitted || fitted;

          return !fitted;
        });

        return _fitted;
      });
    }
    else {
      list = para.json.XR_Animator_scene.object3D_list;
    }
  }

  list?.forEach(obj=>{
    auto_fit_loop(obj);
  });

  window.removeEventListener('SA_MMD_model0_process_bones', adjust_hip_y_offset);
  if (hip_y_offset) {
    window.addEventListener('SA_MMD_model0_process_bones', adjust_hip_y_offset);
  }
}

let _blendshape;
function morph_event() {
  if (!MMD_SA.THREEX.enabled) {
    const model_MMD = THREE.MMD.getModels()[0];
    for (const morph_name in _blendshape) {
      let _m_idx = model_MMD.pmx.morphs_index_by_name[morph_name];
      if (_m_idx != null) {
        let _m = model_MMD.pmx.morphs[_m_idx];
        MMD_SA._custom_morph.push({ key:{ weight:_blendshape[morph_name], morph_type:_m.type, morph_index:_m_idx }, idx:model_MMD.morph.target_index_by_name[morph_name] });
      }
    }
  }
}

function process_gesture() {
  if (!para.json.XR_Animator_scene.on.gesture) return;

  const mc = System._browser.motion_control;
  const handedness = mc.handedness || '左';

  for (const g_event_name in para.json.XR_Animator_scene.on.gesture) {
    const g_event = para.json.XR_Animator_scene.on.gesture[g_event_name];

    for (const d of ['左','右']) {
      const gesture = gesture_plugin.gesture[d];
      gesture.ANY = gesture.OTHERS = true;

      let gestures = [];
      const dir = ((d=='左') ? 'left' : 'right') + '|';
      for (const name in gesture) {
        const name_d = (g_event[dir+name]) ? dir+name : ((g_event[name]) ? name : '');
        if (name_d) {
          gestures.push(name_d);
          for (let i = 0; i <= 3; i++) {
            const name_ext = name_d + '#' + i;
            if (g_event[name_ext])
              gestures.push(name_ext);
          }
          break;
        }
      }
      gestures = [...gestures.filter(name=>name.indexOf('OTHERS')==-1), ...gestures.filter(name=>name.indexOf('OTHERS')!=-1)];

      let hand_pos;
      for (let i = 0; i < gestures.length; i++) {
        let name_full = gestures[i];
        let g = g_event[name_full];
        if (!g) continue;

        let name_raw = name_full;
        if (typeof g == 'string') {
          name_full = g;
          g = g_event[name_full];
          if (!g) continue;
        }

        if (!g.action) continue;
//System._browser.camera.DEBUG_show(name_full+'/'+Date.now())

        const gesture_name = name_full.replace(/\#\d$/, '');

        const g_parent = g_event[gesture_name];
        if (g_parent.action._cooldown_timestamp > RAF_timestamp) continue;

// use unconverted name
        const gesture_name_raw = name_raw.replace(/^.+\|/, '').replace(/\#\d$/, '');
        const ge = gesture[gesture_name_raw];

        const condition = g?.condition;
        if (condition) {
          if (condition.duration) {
//System._browser.camera.DEBUG_show(Object.keys(gesture).join('\n')+'/'+Date.now())
            if (condition.duration > (ge.search_para?.duration || 0)) continue;
//console.log(ge)
          }

          if (condition.hand_facing) {
//console.log(ge)
            if (condition.hand_facing != ((ge.search_para?.duration) ? ge.search_para.hand_facing : ge.hand_facing)) continue;
          }

          if (condition.user_data) {
            let user_data_matched = true;
            for (const name in condition.user_data) {
              const v_obj = gesture_plugin.user_data[name];
              if (v_obj?.timeout && (v_obj._timestamp + v_obj.timeout < RAF_timestamp)) {
                v_obj.value = !v_obj.value;
                delete v_obj.timeout;
              }
              let v = v_obj?.value;
//System._browser.camera.DEBUG_show(name+'/'+!!v+'/'+condition.user_data[name].value+'='+(!!v != condition.user_data[name].value))
              if (!!v != condition.user_data[name].value) {
                user_data_matched = false;
                break;
              }
            }
//System._browser.camera.DEBUG_show('user_data_matched:'+user_data_matched)
            if (!user_data_matched) continue;
          }

          if (condition.hand_hidden) {
//System._browser.camera.DEBUG_show(d+':'+System._browser.camera.poseNet.frames.get_blend_default_motion('skin', d+'腕ＩＫ'))
            if (System._browser.camera.poseNet.frames.get_blend_default_motion('skin', d+'腕ＩＫ') < 1) continue;
          }

          let x_object;
          if (condition.object_target) {
            const object3d = para.json.XR_Animator_scene.object3D_list.find(obj=>obj.id==condition.object_target);
            if (object3d)
              x_object = MMD_SA.THREEX._object3d_list_.find(obj=>obj.uuid==object3d._object3d_uuid);
          }

          if (!hand_pos && (condition.distance_limit || condition.angle_factor || condition.contact_target)) {
            hand_pos = model.get_bone_position_by_MMD_name(d+'手首');
            const hand_ext = v1.set(((d=='左')?1:-1)*0.5, 0, 0).applyQuaternion(MMD_SA_options.model_para_obj.rot_arm_adjust[d+'ひじ'].axis_rot).applyQuaternion(model.get_bone_rotation_by_MMD_name(d+'手首'));
            hand_pos.add(hand_ext);
//System._browser.camera.DEBUG_show('hand_ext'+':\n'+hand_ext.toArray().join('\n'));
          }

          let obj_pos;
          if (condition.distance_limit) {
            if (!x_object) continue;
            obj_pos = v1.copy(x_object._mesh.position);
            if (hand_pos.distanceTo(obj_pos) > condition.distance_limit) continue;
          }
          if (condition.angle_factor) {
            if (!x_object) continue;
            obj_pos = v1.copy(x_object._mesh.position);
            const arm_pos = model.get_bone_position_by_MMD_name(d+'腕');
            if (hand_pos.sub(arm_pos).normalize().dot(obj_pos.sub(arm_pos).normalize()) < condition.angle_factor) continue;
          }

          if (condition.contact_target) {
            const type = condition.contact_target.type;
            if (type == 'sphere') {
              let pt, br;
              const _pos_offset = v3.set(0,0,1);
              switch (condition.contact_target.name) {
                case "chest":
                  pt = model.get_bone_position_by_MMD_name('首').add(model.get_bone_position_by_MMD_name('上半身2')).multiplyScalar(0.5);
                  br = '上半身2';
                  _pos_offset.y += 0.25;
                  break;
                case "left_chest":
                  pt = model.get_bone_position_by_MMD_name('左腕').add(model.get_bone_position_by_MMD_name('上半身2')).multiplyScalar(0.5);
                  br = '上半身2';
                  break;
                case "right_chest":
                  pt = model.get_bone_position_by_MMD_name('右腕').add(model.get_bone_position_by_MMD_name('上半身2')).multiplyScalar(0.5);
                  br = '上半身2';
                  break;
                case "head":
                  br = model.get_bone_rotation_by_MMD_name('頭');
                  pt = model.get_bone_position_by_MMD_name('頭');//.add(v2.set(0, v2.fromArray(model.get_bone_origin_by_MMD_name('頭')).distanceTo(v3.fromArray(model.get_bone_origin_by_MMD_name('首'))), 0).applyQuaternion(br));
                  break;
              }

              const pos_offset = v2.set(0,0,0);
              if (condition.contact_target.position) pos_offset.copy(condition.contact_target.position);
              pos_offset.add(_pos_offset);
              pt.add(pos_offset.applyQuaternion((typeof br == 'string') ? model.get_bone_rotation_by_MMD_name(br) : br));

              if (!System._browser.camera.poseNet._upper_body_only_mode) pt.z = pt.z * 0.5 + hand_pos.z * (1-0.5);

              const dis = hand_pos.distanceTo(pt);
System._browser.camera.DEBUG_show(condition.contact_target.name+':'+dis)
              if (dis > condition.contact_target.radius) continue;
            }
            else if (/upper|lower|left|right/.test(type)) {
              let pos;
              switch (condition.contact_target.name) {
                case "neck":
                  pos = model.get_bone_position_by_MMD_name('首');
                  break;
                case "head":
                  pos = model.get_bone_position_by_MMD_name('頭');
                  break;
              }

              if (type.indexOf('upper') != -1) {
                if (hand_pos.y < pos.y) continue;
              }
              else if (type.indexOf('lower') != -1) {
                if (hand_pos.y > pos.y) continue;
              }

              if (type.indexOf('left') != -1) {
                if (hand_pos.x > pos.x) continue;
              }
              else if (type.indexOf('right') != -1) {
                if (hand_pos.x < pos.x) continue;
              }
            }
          }
        }

        if (g.action.attach) {
          const passed = Object.keys(g.action.attach).every((object_id, i)=>{
            const object3d = para.json.XR_Animator_scene.object3D_list.find(obj=>obj.id==object_id);
            if (!object3d) return i != 0;

            const x_object = MMD_SA.THREEX._object3d_list_.find(obj=>obj.uuid==object3d._object3d_uuid);

            let p_bone;
            if (x_object.parent_bone_list) {
              const parent_bone_index = g.action.attach[object_id].parent_bone_index || 0;
              p_bone = x_object.parent_bone_list[parent_bone_index];
            }
            else {
              p_bone = x_object.parent_bone;
            }

            const hand_free = MMD_SA.THREEX._object3d_list_.every(obj=>!obj.parent_bone || obj.parent_bone.disabled || ((x_object.parent_bone_list) ? x_object.parent_bone_list.indexOf(obj.parent_bone) != -1 : obj.parent_bone == p_bone) || (obj.parent_bone.name != d + p_bone.name.substring(1)));
            if (!hand_free) return i != 0;

            x_object.parent_bone = p_bone;
            p_bone.disabled = false;

            let ignore_gesture_side = g.action.attach[object_id].ignore_gesture_side;
            if (ignore_gesture_side == null)
              ignore_gesture_side = i > 0;

            if (!ignore_gesture_side && ((p_bone.name.indexOf('左')!=-1 || p_bone.name.indexOf('右')!=-1) && (p_bone.name.charAt(0) != d))) {
              p_bone.name = d + p_bone.name.substring(1);
              p_bone.position.x *= -1;
              const q = MMD_SA.TEMP_q.setFromEuler(MMD_SA.TEMP_v3.copy(p_bone.rotation).multiplyScalar(Math.PI/180).multiply(v1.set(-1,1,-1)), 'YXZ');
              q.x *= -1;
              q.w *= -1;
              const rot = MMD_SA.TEMP_v3.setEulerFromQuaternion(q, 'YXZ').multiplyScalar(180/Math.PI).multiply(v1);
              p_bone.rotation.x = rot.x;
              p_bone.rotation.y = rot.y;
              p_bone.rotation.z = rot.z;
            }

            return true;
          });

          if (!passed) continue;
        }
        else if (g.action.detach) {
          Object.keys(g.action.detach).forEach((object_id, i)=>{
            const object3d = para.json.XR_Animator_scene.object3D_list.find(obj=>obj.id==object_id);
            if (!object3d) return;

            const x_object = MMD_SA.THREEX._object3d_list_.find(obj=>obj.uuid==object3d._object3d_uuid);

            let p_bone = x_object.parent_bone;
            if (p_bone.disabled) return;
//            if (p_bone.name.charAt(0) != d) continue;

            p_bone.disabled = true;
            if (x_object.placement.hidden) {
              System._browser.on_animation_update.add(()=>{x_object._obj_proxy.hidden = true;}, 1,0);
            }
          });
        }

        if (g_parent.action.cooldown) {
          g_parent.action._cooldown_timestamp = RAF_timestamp + g?.action.cooldown;
//System._browser.camera.DEBUG_show('cooldown:'+g_parent.action._cooldown_timestamp, 2)
        }

        if (g.action.motion_tracking) {
          if (g.action.motion_tracking.arm_tracking && (g.action.motion_tracking.arm_tracking.use_IK == null)) g.action.motion_tracking.arm_tracking.use_IK = true;

          let motion_tracking = MMD_SA.MMD.motionManager.para_SA.motion_tracking;
          if (!motion_tracking) motion_tracking = MMD_SA.MMD.motionManager.para_SA.motion_tracking = {};
          if (!motion_tracking._default_) motion_tracking._default_ = {};
          for (const p in g.action.motion_tracking) {
            const p_obj = g.action.motion_tracking[p];
            if (p_obj) {
              motion_tracking._default_[p] = motion_tracking[p];
              motion_tracking[p] = p_obj;
            }
            else {
              motion_tracking[p] = motion_tracking._default_[p];
              delete motion_tracking._default_[p];
            }
          }
        }

        if (g.action.blendshape) {
          if (Object.keys(g.action.blendshape).length) {
            _blendshape = g.action.blendshape;
            window.addEventListener("SA_MMD_model0_process_morphs", morph_event);
          }
          else {
            window.removeEventListener("SA_MMD_model0_process_morphs", morph_event);
          }
        }

        const user_data = g.action.user_data;
        if (user_data) {
          for (const name in user_data) {
            const obj = { value:user_data[name].value };
            if (user_data[name].timeout) {
              obj.timeout = user_data[name].timeout;
              obj._timestamp = RAF_timestamp;
            }
            gesture_plugin.user_data[name] = obj;
          }
        }

        break;
      }
    }
  }
}

function restore_explorer_mode(e) {
  const ev = e.detail.e;
  if (/^(Key[WASD]|Space)$/.test(ev.code)) {
    MMD_SA_options._motion_shuffle_list_default = [MMD_SA_options.motion_index_by_name['tsuna_standby']];
    MMD_SA_options.motion_shuffle_list_default = MMD_SA_options._motion_shuffle_list_default.slice();
    MMD_SA._force_motion_shuffle = true;

    System._browser.on_animation_update.add(()=>{
      explorer_mode_locked = null;
      MMD_SA_options.Dungeon_options.character_movement_disabled = false;
      MMD_SA_options.Dungeon_options.camera_position_z_sign = -1;
      MMD_SA_options.Dungeon.update_camera_position_base();
      MMD_SA_options.Dungeon.no_collision = false;

      MMD_SA_options.Dungeon.para_by_grid_id[2].ground_y = para.json.XR_Animator_scene.settings?.explorer_mode?.ground_y || 0;
    }, 0,0);

    window.removeEventListener('SA_keydown', restore_explorer_mode);
  }
}

function adjust_hip_y_offset() {
  THREE.MMD.getModels()[0].mesh.bones_by_name['センター'].position.y += hip_y_offset;
}

function adjust_height_offset_by_bone() {
  const f = System._browser.camera.poseNet.frames;

  height_offset_by_bone.forEach(config=>{
    for (const b in config.bone) {
      window.addEventListener('SA_camera_poseNet_process_bones_onstart', ()=>{
        if (f._skin[b]) {
          const offset = config.bone[b] * config.scale;
          f._skin[b].pos.y += offset;
          f._skin[b]._offset_y_ = offset;
        }
      }, {once:true});
    }
  });
}

const gesture_plugin = (function () {
  var initialized;

  var GE;
  function init() {
if (initialized) return;

const mc = System._browser.motion_control;


const finger1_horizontal = new fp.GestureDescription('finger1_horizontal');
finger1_horizontal.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
finger1_horizontal.addDirection(fp.Finger.Index, fp.FingerDirection.HorizontalLeft,  1.0);
finger1_horizontal.addDirection(fp.Finger.Index, fp.FingerDirection.HorizontalRight, 1.0);
finger1_horizontal.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpLeft,  0.9);
finger1_horizontal.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpRight, 0.9);
for (let finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  finger1_horizontal.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  finger1_horizontal.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
}
mc.gestures.custom.finger1_horizontal = finger1_horizontal;

const finger2_horizontal = new fp.GestureDescription('finger2_horizontal');
for (let finger of [fp.Finger.Index, fp.Finger.Middle]) {
  finger2_horizontal.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
  finger2_horizontal.addDirection(finger, fp.FingerDirection.HorizontalLeft,  1.0);
  finger2_horizontal.addDirection(finger, fp.FingerDirection.HorizontalRight, 1.0);
  finger2_horizontal.addDirection(finger, fp.FingerDirection.DiagonalUpLeft,  0.9);
  finger2_horizontal.addDirection(finger, fp.FingerDirection.DiagonalUpRight, 0.9);
}
for (let finger of [fp.Finger.Ring, fp.Finger.Pinky]) {
  finger2_horizontal.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  finger2_horizontal.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
}
mc.gestures.custom.finger2_horizontal = finger2_horizontal;

const finger1_down = new fp.GestureDescription('finger1_down');
finger1_down.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
finger1_down.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalDown,  1.0);
finger1_down.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalDownLeft,  0.9);
finger1_down.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalDownRight, 0.9);
for (let finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  finger1_down.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  finger1_down.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
}
mc.gestures.custom.finger1_down = finger1_down;

const finger2_down = new fp.GestureDescription('finger2_down');
for (let finger of [fp.Finger.Index, fp.Finger.Middle]) {
  finger2_down.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
  finger2_down.addDirection(finger, fp.FingerDirection.VerticalDown,  1.0);
  finger2_down.addDirection(finger, fp.FingerDirection.DiagonalDownLeft,  0.9);
  finger2_down.addDirection(finger, fp.FingerDirection.DiagonalDownRight, 0.9);
}
for (let finger of [fp.Finger.Ring, fp.Finger.Pinky]) {
  finger2_down.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  finger2_down.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
}
mc.gestures.custom.finger2_down = finger2_down;

const finger2_up = new fp.GestureDescription('finger2_up');
for (let finger of [fp.Finger.Index, fp.Finger.Middle]) {
  finger2_up.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
  finger2_up.addDirection(finger, fp.FingerDirection.VerticalUp,  1.0);
}
for (let finger of [fp.Finger.Ring, fp.Finger.Pinky]) {
  finger2_up.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  finger2_up.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
}
mc.gestures.custom.finger2_up = finger2_up;


GE = new fp.GestureEstimator(ge_list.map(ge=>mc.gestures.custom[ge[0]]));

window.addEventListener('SA_MMD_model0_onmotionchange', (e)=>{
  if (e.detail.motion_old != e.detail.motion_new)
    gesture_plugin.user_data = {};
});

initialized = true;
  }

  const ge_list = [
[ 'index_pinky', [[{thumb_out:false}, ['fox','horns']]] ],
[ 'thumb', [[null, ['grab','fist']]] ],
[ 'palm_open' ],

[ 'finger1_horizontal' ],
[ 'finger2_horizontal' ],

[ 'finger1_down' ],
[ 'finger2_down' ],

[ 'index_up', [[{hand_facing:'sideway'}, ['finger1_up']], [null, ['finger1_up']]] ],
[ 'finger2_up' ],
  ];

  return {
    enabled: false,

    gesture: { '左':{}, '右':{} },

    user_data: {},

    process: async function (para) {
function process_gesture(hand,d, g_id, para_list) {
  let ge_last;
  (para_list || [[null, [g_id]]]).some(para=>{
    for (let i = 0, i_max = 2; i <= i_max; i++) {
      const duration = i * 500;
      const p = Object.assign({ hand:hand, duration:duration }, para[0]);
      const ge = mc.gestures.search(g_id, p);
      if (ge) {
        ge_last = ge;
      }
      else {
        break;
      }
    }

    if (ge_last) {
      (para[1] || [g_id]).forEach(name=>{
//mc._debug_msg.push(name + ((_duration) ? '|'+_duration : ''));
        this.gesture[d][name] = ge_last;
      });
      return true;
    }
  });

  if (ge_last)
    mc._debug_msg.push(d+'/'+g_id);//+'/'+Date.now());

  return ge_last;
}

const mc = System._browser.motion_control;

if (!this.enabled) return;

if (!para.posenet_data) return;

init();

for (const d of ['左', '右']) {
  this.gesture[d] = {};
}

const handpose = para.posenet_data.handpose;
if (!handpose || !handpose.length) return;

const handedness = mc.handedness || '左';
//const dir = (handedness == '右') ? 0 : 1;
//const hand = handpose.find(h=>h._d==handedness);

//console.log(para.posenet_data);

//mc._debug_msg.push(handedness+'/'+Date.now());

handpose.forEach(hand=>{
  if (!hand._used) return;

  const d = hand._d;
//  if (d != handedness) return;
  const de = (d=='左')?'left':'right';

  mc.gestures.estimate(GE, hand);

  let ge_detected;
  ge_list.some(ge=>{
    ge_detected = process_gesture.call(this, hand,d, ge[0], ge[1]);
    return ge_detected;
  });

  if (!ge_detected)
    mc._debug_msg.push('(no gesture)'+'/'+d);

});
    },
  };
})();

let para;

let model;
let motion_para;
let obj_para, model_para, placement, af, type;
let object_3d;

let height_offset_by_bone;

let hip_y_offset = 0;

let explorer_mode_locked;

const motion_target_list = [];

let model_position0;
const model_position_offset = new THREE.Vector3();

const fadeout_disabled = { condition:()=>false };

function load(p) {
  function onmotionchange(e) {
//    if (e.detail.is_loop) return;
    if (e.detail.motion_new == e.detail.motion_old) return;

    const f = System._browser.camera.poseNet.frames;
    height_offset_by_bone.forEach(config=>{
      for (const b in config.bone) {
        if (f._skin[b])
          f._skin[b]._offset_y_ = null;
      }
    });
    height_offset_by_bone.length = 0;

    hip_y_offset = 0;
    window.removeEventListener('SA_MMD_model0_process_bones', adjust_hip_y_offset);

    const filename_new = e.detail.motion_new.para_SA._path.replace(/^.+[\/\\]/, '').replace(/\.\w{3,4}$/, '');
//DEBUG_show(filename_new)
    const motion_target_matched = motion_target_list.indexOf(filename_new) != -1;

    const _motion_blending = ((!explorer_mode_locked && MMD_SA_options.Dungeon_options.character_movement_disabled) || motion_target_matched) ? e.detail.motion_old.para_SA.motion_blending : null;

    let _fadeout;
    if (_motion_blending) {
      _fadeout = _motion_blending.fadeout;
      _motion_blending.fadeout = fadeout_disabled;
    }
/*
    MMD_SA.THREEX._object3d_list_.forEach(obj=>{
      if (obj.parent_bone?.attached && obj._on_gesture)
        obj.parent_bone.disabled = true;
    });
*/

    const motion_tracking = e.detail.motion_old.para_SA.motion_tracking;
    if (motion_tracking) {
      if (motion_tracking._default_) {
        let motion_tracking_new = e.detail.motion_new.para_SA.motion_tracking;
        if (!motion_tracking_new) motion_tracking_new = e.detail.motion_new.para_SA.motion_tracking = {};
        if (!motion_tracking_new._default_) motion_tracking_new._default_ = {};
        for (const p in motion_tracking._default_) {
          motion_tracking_new._default_[p] = motion_tracking_new[p];
          motion_tracking_new[p] = motion_tracking[p];
        }
      }
      Object.assign(motion_tracking, motion_tracking._default_);
      delete motion_tracking._default_;
    }

    System._browser.on_animation_update.remove(auto_fit, 0);
    System._browser.on_animation_update.add(auto_fit, 0,0);
    if (_motion_blending) {
      System._browser.on_animation_update.add(()=>{
        _motion_blending.fadeout=_fadeout;
      }, 0,0);
    }

//    System._browser.on_animation_update.add(auto_fit, 30,0);
  }

  function scene_onunload(e) {
    System._browser.motion_control.enabled = false;
    gesture_plugin.enabled = false;

    System._browser.on_animation_update.remove(process_gesture, 0);
    System._browser.on_animation_update.remove(adjust_height_offset_by_bone, 0);

    motion_target_list.length = 0;

    const motion_tracking = MMD_SA.MMD.motionManager.para_SA.motion_tracking;
    if (motion_tracking) {
      Object.assign(motion_tracking, motion_tracking._default_);
      delete motion_tracking._default_;
    }

    hip_y_offset = 0;
    window.removeEventListener('SA_MMD_model0_process_bones', adjust_hip_y_offset);

    window.removeEventListener('SA_MMD_model0_onmotionchange', onmotionchange);
  }

  para = p;

  let use_gesture_plugin = !!p.json.XR_Animator_scene.on.gesture;

  if (use_gesture_plugin) {
    for (const g_event_name in p.json.XR_Animator_scene.on.gesture) {
      const g_event = p.json.XR_Animator_scene.on.gesture[g_event_name];
      for (const g_name in g_event) {
        const g = g_event[g_name];
        const attach = g.action?.attach;
        if (attach) {
          for (const object_id in attach) {
            const object3d = para.json.XR_Animator_scene.object3D_list.find(obj=>obj.id==object_id);
            if (object3d) {
              const x_object = MMD_SA.THREEX._object3d_list_.find(obj=>obj.uuid==object3d._object3d_uuid);
              x_object._on_gesture = true;
            }
          }
        }
      }
    }

    System._browser.motion_control.enabled = true;
    System._browser.motion_control.add_plugin(gesture_plugin);
    gesture_plugin.enabled = true;

    System._browser.on_animation_update.remove(process_gesture, 0);
    System._browser.on_animation_update.add(process_gesture, 0,0,-1);
  }

  height_offset_by_bone = [];
  System._browser.on_animation_update.remove(adjust_height_offset_by_bone, 0);
  System._browser.on_animation_update.add(adjust_height_offset_by_bone, 0,0,-1);

  para.json.XR_Animator_scene.auto_fit_list?.forEach(list=>list.forEach(af=>{
    if (af.motion_target)
      motion_target_list.push(...af.motion_target);
  }));
//console.log(motion_target_list)

  hip_y_offset = 0;
  window.removeEventListener('SA_MMD_model0_process_bones', adjust_hip_y_offset);

  window.removeEventListener('SA_MMD_model0_onmotionchange', onmotionchange);
  window.addEventListener('SA_MMD_model0_onmotionchange', onmotionchange);

  window.removeEventListener('SA_XR_Animator_scene_onunload', scene_onunload);
  window.addEventListener('SA_XR_Animator_scene_onunload', scene_onunload);

  auto_fit();  
}

export { load };
