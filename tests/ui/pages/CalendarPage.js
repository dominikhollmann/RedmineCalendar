export class CalendarPage {
  constructor(page) {
    this.page = page;
  }

  get navPrev() {
    return this.page.getByTestId('cal-nav-prev');
  }
  get navNext() {
    return this.page.getByTestId('cal-nav-next');
  }
  get navToday() {
    return this.page.getByTestId('cal-nav-today');
  }
  get navTitle() {
    return this.page.getByTestId('cal-nav-title');
  }
  get weekTotal() {
    return this.page.getByTestId('week-total');
  }
  get loading() {
    return this.page.getByTestId('loading-overlay');
  }
  get errorBanner() {
    return this.page.getByTestId('error-banner');
  }
  get errorRetry() {
    return this.page.getByTestId('error-retry');
  }
  get calendar() {
    return this.page.getByTestId('calendar');
  }
  get toolbar() {
    return this.page.getByTestId('cal-toolbar');
  }
  get timeEntries() {
    return this.page.locator('[data-testid="time-entry"]');
  }
}
