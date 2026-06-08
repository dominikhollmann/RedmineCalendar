export class ModalPage {
  constructor(page) {
    this.page = page;
  }

  get modal() {
    return this.page.locator('#lean-time-modal');
  }
  get search() {
    return this.page.locator('#lean-search');
  }
  get save() {
    return this.page.locator('#lean-save');
  }
  get cancel() {
    return this.page.locator('#lean-cancel');
  }
  get deleteBtn() {
    return this.page.locator('#lean-delete');
  }
  get comment() {
    return this.page.locator('#lean-comment');
  }
  get dateInput() {
    return this.page.locator('#lean-info-date');
  }
  get startInput() {
    return this.page.locator('#lean-info-start');
  }
  get endInput() {
    return this.page.locator('#lean-info-end');
  }
  get duration() {
    return this.page.locator('#lean-info-dur');
  }
  get errorMessage() {
    return this.page.locator('#lean-error');
  }
}
