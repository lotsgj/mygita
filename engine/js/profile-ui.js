import { resizeProfilePhoto } from './profile-store.js';

export class ProfileUI {
  constructor({ store, onSelected, onCreated, onChanged, translate = (key, fallback) => fallback, onInterfaceLanguagePreview = () => {}, languageModel = () => null, products = () => [] }) {
    this.store = store;
    this.onSelected = onSelected;
    this.onCreated = onCreated;
    this.onChanged = onChanged;
    this.translate = translate;
    this.onInterfaceLanguagePreview = onInterfaceLanguagePreview;
    this.languageModel = languageModel;
    this.products = products;
    this.editingPid = null;
    this.photo = '';
    this.bind();
  }

  initials(profile) {
    return profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'ॐ';
  }

  avatar(profile, className = 'profile-avatar') {
    if (profile.photo) {
      const image = document.createElement('img');
      image.className = className;
      image.src = profile.photo;
      image.alt = '';
      return image;
    }
    const fallback = document.createElement('span');
    fallback.className = className + ' profile-initials';
    fallback.textContent = this.initials(profile);
    return fallback;
  }

  async showSelection({ switching = false } = {}) {
    const profiles = await this.store.list();
    const defaultPid = await this.store.defaultPid();
    const list = document.getElementById('profile-list');
    list.textContent = '';
    profiles.forEach((profile) => {
      const card = document.createElement('article');
      card.className = 'profile-card';
      const select = document.createElement('button');
      select.type = 'button';
      select.className = 'profile-select';
      select.dataset.pid = profile.pid;
      select.appendChild(this.avatar(profile, 'profile-card-avatar'));
      const copy = document.createElement('span');
      copy.className = 'profile-card-copy';
      const name = document.createElement('strong');
      name.textContent = profile.name;
      const language = document.createElement('small');
      const interfaceName = profile.interfaceLanguage === 'kn' ? 'ಕನ್ನಡ' : 'English';
      const contentName = this.languageModel()?.registry?.[profile.contentLanguage]?.nativeName || profile.contentLanguage;
      language.textContent = interfaceName + ' · ' + contentName;
      copy.append(name, language);
      select.appendChild(copy);
      if (profile.pid === defaultPid) {
        const badge = document.createElement('span');
        badge.className = 'default-badge';
        badge.textContent = this.translate('profile.defaultBadge', 'Default');
        select.appendChild(badge);
      }
      const actions = document.createElement('div');
      actions.className = 'profile-card-actions';
      actions.innerHTML = `<button type="button" data-profile-action="edit" data-pid="${profile.pid}">${this.translate('profile.editAction', 'Edit')}</button><button type="button" data-profile-action="default" data-pid="${profile.pid}">${profile.pid === defaultPid ? this.translate('profile.unsetDefault', 'Unset default') : this.translate('profile.makeDefault', 'Make default')}</button><button type="button" data-profile-action="delete" data-pid="${profile.pid}">${this.translate('profile.delete', 'Delete')}</button>`;
      card.append(select, actions);
      list.appendChild(card);
    });
    const selectionTitle = document.getElementById('profile-selection-title');
    selectionTitle.dataset.i18n = switching ? 'profile.switch' : 'profile.who';
    selectionTitle.textContent = switching ? this.translate('profile.switch', 'Switch profile') : this.translate('profile.who', 'Who is using Gitaverse?');
    document.getElementById('profile-selection-back').hidden = !switching;
  }

  async showForm(profile = null, { focusPreferences = false } = {}) {
    this.editingPid = profile?.pid || null;
    this.photo = profile?.photo || '';
    const formTitle = document.getElementById('profile-form-title');
    const formIntro = document.getElementById('profile-form-intro');
    formTitle.dataset.i18n = profile ? 'profile.edit' : 'profile.create';
    formIntro.dataset.i18n = profile ? 'profile.intro.edit' : 'profile.intro.create';
    formTitle.textContent = profile ? this.translate('profile.edit', 'Edit profile') : this.translate('profile.create', 'Create your profile');
    formIntro.textContent = profile
      ? this.translate('profile.intro.edit', 'Keep this profile’s local preferences up to date.')
      : this.translate('profile.intro.create', 'Profiles keep each person’s language and experience separate on this device.');
    document.getElementById('profile-name').value = profile?.name || '';
    document.getElementById('profile-dob').value = profile?.dob || '';
    document.getElementById('profile-gender').value = profile?.gender || '';
    document.getElementById('profile-interface-language').value = profile?.interfaceLanguage || '';
    const contentSelect = document.getElementById('profile-content-language');
    const model = this.languageModel();
    if (model) {
      contentSelect.replaceChildren(...model.content.map((language) => {
        const option = document.createElement('option'); option.value = language;
        option.textContent = model.registry[language]?.nativeName || model.registry[language]?.name || language;
        return option;
      }));
    }
    contentSelect.value = profile?.contentLanguage || model?.defaultContent || 'en';
    await this.renderExperienceLanguagePreferences(profile);
    document.getElementById('profile-default').checked = profile ? (await this.store.defaultPid()) === profile.pid : true;
    document.getElementById('profile-form-cancel').hidden = !profile;
    document.getElementById('profile-form-error').textContent = '';
    this.renderPhotoPreview(profile);
    requestAnimationFrame(() => {
      const target = focusPreferences ? document.getElementById('profile-preferences-section') : document.getElementById('profile-name');
      target?.scrollIntoView({ block: focusPreferences ? 'center' : 'nearest', behavior: 'smooth' });
      target?.focus({ preventScroll: true });
    });
  }

  productName(product, language) {
    return product.metadata?.[language]?.name || product.metadata?.en?.name || product.config?.name || product.id;
  }

  allowedPanelLanguages(panel, model) {
    if (panel.allowedLanguages === 'all') return [model.source, ...model.content];
    if (Array.isArray(panel.allowedLanguages)) return panel.allowedLanguages;
    return model.content;
  }

  async renderExperienceLanguagePreferences(profile) {
    const section = document.getElementById('experience-language-preferences');
    const list = document.getElementById('experience-language-list');
    if (!section || !list) return;
    section.hidden = !profile;
    list.textContent = '';
    if (!profile) return;
    const interfaceLanguage = profile.interfaceLanguage || 'en';
    for (const product of this.products()) {
      const model = product.config?.languages;
      const experiences = (product.config?.experiences || []).filter((experience) => experience.panels?.some((panel) => panel.userSelectable));
      if (!model || !experiences.length) continue;
      const productGroup = document.createElement('section'); productGroup.className = 'experience-language-product';
      const heading = document.createElement('h4'); heading.textContent = this.productName(product, interfaceLanguage); productGroup.appendChild(heading);
      for (const experience of experiences) {
        const overrides = await this.store.getPanelLanguages(profile.pid, product.id, experience.id);
        const card = document.createElement('details'); card.className = 'experience-language-card';
        card.dataset.productId = product.id; card.dataset.experienceId = experience.id;
        const summary = document.createElement('summary'); summary.textContent = experience.label || experience.id; card.appendChild(summary);
        const fields = document.createElement('div'); fields.className = 'experience-language-fields';
        experience.panels.filter((panel) => panel.userSelectable).forEach((panel) => {
          const field = document.createElement('label'); field.className = 'experience-language-field';
          const caption = document.createElement('span'); caption.className = 'field-label';
          const fallbackLabel = panel.id.replace(/-/g, ' ').replace(/^./, (value) => value.toUpperCase());
          caption.textContent = this.translate(`profile.panel.${panel.id}`, fallbackLabel);
          const select = document.createElement('select'); select.className = 'profile-input'; select.dataset.panelId = panel.id;
          const defaultOption = document.createElement('option'); defaultOption.value = '';
          defaultOption.textContent = this.translate('profile.experienceDefault', 'Experience default'); select.appendChild(defaultOption);
          this.allowedPanelLanguages(panel, model).forEach((language) => {
            if (!model.registry?.[language]) return;
            const option = document.createElement('option'); option.value = language;
            option.textContent = model.registry[language].nativeName || model.registry[language].name || language; select.appendChild(option);
          });
          select.value = overrides[panel.id] || '';
          field.append(caption, select); fields.appendChild(field);
        });
        const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'quiet-button experience-language-reset';
        reset.textContent = this.translate('profile.useExperienceDefaults', 'Use experience defaults');
        reset.addEventListener('click', () => fields.querySelectorAll('select').forEach((select) => { select.value = ''; }));
        fields.appendChild(reset); card.appendChild(fields); productGroup.appendChild(card);
      }
      list.appendChild(productGroup);
    }
    section.hidden = !list.childElementCount;
  }

  async saveExperienceLanguagePreferences(pid) {
    const cards = document.querySelectorAll('.experience-language-card[data-product-id][data-experience-id]');
    await Promise.all([...cards].map((card) => {
      const overrides = Object.fromEntries([...card.querySelectorAll('select[data-panel-id]')]
        .filter((select) => select.value)
        .map((select) => [select.dataset.panelId, select.value]));
      return this.store.setPanelLanguages(pid, card.dataset.productId, card.dataset.experienceId, overrides);
    }));
  }

  renderPhotoPreview(profile = null) {
    const preview = document.getElementById('profile-photo-preview');
    preview.textContent = '';
    preview.appendChild(this.avatar({ name: document.getElementById('profile-name').value || profile?.name || '', photo: this.photo }, 'profile-photo-avatar'));
    document.getElementById('profile-photo-remove').hidden = !this.photo;
  }

  async renderPills(profile) {
    document.querySelectorAll('[data-profile-pill]').forEach((button) => {
      button.textContent = '';
      const avatar = this.avatar(profile, 'profile-pill-avatar');
      if (button.classList.contains('topbar-profile-pill') && !profile.photo) {
        avatar.textContent = Array.from(profile.name.trim())[0]?.toUpperCase() || 'ॐ';
      }
      button.appendChild(avatar);
      const name = document.createElement('span');
      name.textContent = profile.name;
      if (!button.classList.contains('topbar-profile-pill')) button.appendChild(name);
      button.dataset.pid = profile.pid;
      button.setAttribute('aria-label', 'Profile: ' + profile.name + '. Open profile options.');
    });
  }

  bind() {
    document.getElementById('profile-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const error = document.getElementById('profile-form-error');
      error.textContent = '';
      try {
        if (!document.getElementById('profile-name').value.trim()) throw new Error(this.translate('validation.name', 'Enter a profile name.'));
        const dob = document.getElementById('profile-dob').value;
        if (!dob || new Date(dob + 'T00:00:00') > new Date()) throw new Error(this.translate('validation.dob', 'Enter a valid date of birth.'));
        const interfaceLanguage = document.getElementById('profile-interface-language').value;
        const contentLanguage = document.getElementById('profile-content-language').value;
        if (!interfaceLanguage) throw new Error(this.translate('validation.appLanguage', 'Choose an app language.'));
        if (!contentLanguage) throw new Error(this.translate('validation.contentLanguage', 'Choose a preferred Gita content language.'));
        const profile = await this.store.save({
          pid: this.editingPid,
          name: document.getElementById('profile-name').value,
          dob,
          gender: document.getElementById('profile-gender').value,
          interfaceLanguage,
          contentLanguage,
          photo: this.photo,
          analyticsConsent: true
        });
        if (this.editingPid) await this.saveExperienceLanguagePreferences(profile.pid);
        if (document.getElementById('profile-default').checked) await this.store.setDefaultPid(profile.pid);
        else if ((await this.store.defaultPid()) === profile.pid) await this.store.setDefaultPid(null);
        if (this.editingPid) await this.onChanged(profile);
        else await this.onCreated(profile);
      } catch (failure) {
        error.textContent = failure.message || this.translate('validation.profileSave', 'The profile could not be saved.');
      }
    });
    document.getElementById('profile-name').addEventListener('input', () => this.renderPhotoPreview());
    document.getElementById('profile-interface-language').addEventListener('change', (event) => {
      const content = document.getElementById('profile-content-language');
      if (!this.editingPid && event.target.value) content.value = event.target.value;
      this.onInterfaceLanguagePreview(event.target.value || 'en');
    });
    document.getElementById('profile-photo').addEventListener('change', async (event) => {
      const error = document.getElementById('profile-form-error');
      try {
        this.photo = await resizeProfilePhoto(event.target.files?.[0]);
        this.renderPhotoPreview();
      } catch (failure) { error.textContent = failure.message; }
    });
    document.getElementById('profile-photo-remove').addEventListener('click', () => {
      this.photo = '';
      document.getElementById('profile-photo').value = '';
      this.renderPhotoPreview();
    });
    document.getElementById('profile-list').addEventListener('click', async (event) => {
      const select = event.target.closest('.profile-select');
      if (select) return this.onSelected(await this.store.get(select.dataset.pid));
      const action = event.target.closest('[data-profile-action]');
      if (!action) return;
      const profile = await this.store.get(action.dataset.pid);
      if (action.dataset.profileAction === 'edit') return this.onChanged(profile, { edit: true });
      if (action.dataset.profileAction === 'default') {
        const current = await this.store.defaultPid();
        await this.store.setDefaultPid(current === profile.pid ? null : profile.pid);
        return this.showSelection({ switching: true });
      }
      if (action.dataset.profileAction === 'delete' && window.confirm('Delete the profile “' + profile.name + '” from this device?')) {
        await this.store.remove(profile.pid);
        const remaining = await this.store.list();
        if (!remaining.length) return this.onChanged(null, { setup: true });
        return this.onChanged(null, { deletedPid: profile.pid, remaining });
      }
    });
  }
}
