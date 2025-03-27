/**
 * @jest-environment jsdom
 */

import {fireEvent, screen, waitFor} from "@testing-library/dom";
import '@testing-library/jest-dom/extend-expect';
import userEvent from "@testing-library/user-event";
import {localStorageMock} from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import NewBill from "../containers/NewBill.js";
import NewBillUI from "../views/NewBillUI.js";
import {ROUTES, ROUTES_PATH} from "../constants/routes.js";
import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore);


describe("Given I am connected as an employee", () => {

  // Test that checks if all form fields are presents
  describe("When I am on NewBill Page", () => {
    test("Then form should appear", async () => {
      // Injecting the NewBill page UI into the document
      document.body.innerHTML = NewBillUI();

      // Checking title presence
      const sendNewBillText = await waitFor(() => screen.getByText("Envoyer une note de frais"));
      expect(sendNewBillText).toBeTruthy();

      // Checking fields presence
      const expenseTypeDropdown = await waitFor(() => screen.getByTestId("expense-type"));
      expect(expenseTypeDropdown).toBeTruthy();

      const expenseNameInput = await waitFor(() => screen.getByTestId("expense-name"));
      expect(expenseNameInput).toBeTruthy();

      const datepicker = await waitFor(() => screen.getByTestId("datepicker"));
      expect(datepicker).toBeTruthy();

      const amountInput = await waitFor(() => screen.getByTestId("amount"));
      expect(amountInput).toBeTruthy();

      const vatInput = await waitFor(() => screen.getByTestId("vat"));
      expect(vatInput).toBeTruthy();

      const pctInput = await waitFor(() => screen.getByTestId("pct"));
      expect(pctInput).toBeTruthy();

      const commentartTextArea = await waitFor(() => screen.getByTestId("commentary"));
      expect(commentartTextArea).toBeTruthy();

      const fileField = await waitFor(() => screen.getByTestId("file"));
      expect(fileField).toBeTruthy();
    })
  });
})

// Integration tests POST
describe("Given I am connected as an employee and I am on NewBill Page", () => {

  // POST valid form
  describe("When I POST valid bill creation form", () => {
    test("Then submit handlers should be called, and should be redirected to bills page", async () => {
      // Spy the bills mock
      jest.spyOn(mockStore, "bills");
      // Injecting the NewBill page UI into the document
      document.body.innerHTML = NewBillUI();

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      };

      // Assigning localStorage in Jest context with localStorageMock
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      // Put user role and login in mocked localStorage
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }));

      // Instantiating NewBill container where the page scripts are
      const newBill = new NewBill({
        document, onNavigate, store: mockStore, localStorage: window.localStorage
      });

      // Spying methods of NewBill container that we want to test
      const handleSubmit = jest.spyOn(newBill, "handleSubmit");
      const createFile = jest.spyOn(newBill, "createFile");
      const billsCreate = jest.spyOn(mockStore.bills(), "create");

      // Fill form with test data
      screen.getByTestId("expense-type").value = "Transports";
      screen.getByTestId("expense-name").value = "Train Paris-Marseille";
      screen.getByTestId("amount").value = "100";
      screen.getByTestId("datepicker").value = "2023-03-15";
      screen.getByTestId("vat").value = "20";
      screen.getByTestId("pct").value = "20";
      screen.getByTestId("commentary").value = "Voyage pro";

      // Creates file and upload to the file input of the form
      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "facture.jpg", { type: "image/jpeg" });
      await userEvent.upload(fileInput, file);

      // Calling form submit event with spied instance of submit callback
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit);
      fireEvent.submit(form);

      // We expect that methods were called
      expect(handleSubmit).toBeCalled();
      expect(createFile).toBeCalled();

      expect(billsCreate).toHaveBeenCalled();

      // We expect that we went to Bills view
      const billsPageTitle = await waitFor(() => screen.getByText("Mes notes de frais"));
      expect(billsPageTitle).toBeTruthy();
    });
  });

  // POST API error (404 and 500)
  describe("When an error occurs on API", () => {
    beforeEach(() => {
      // Spy the bills mock
      jest.spyOn(mockStore, "bills");

      // Assigning localStorage in Jest context with localStorageMock
      Object.defineProperty(
          window,
          'localStorage',
          { value: localStorageMock }
      )

      // Put user role and login in mocked localStorage
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: "a@a"
      }))

      // Reinitialize body HTML before each tests
      document.body.innerHTML = "";

      // Create 'root' element for router
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)

      // Calling the router
      router()
    });

    test("Then post bill to API and fails with 404 message error in console", async () => {
      // Spying console.error method
      const logSpy = jest.spyOn(global.console, 'error');

      // Instantiating error in variable in order to check that console.error was called with this error
      const error = new Error("Erreur 404");

      // Mock implementation of bills store with error
      mockStore.bills.mockImplementation(() => ({
        create: () => Promise.reject(error),
        update: () => Promise.reject(error),
      }));

      window.onNavigate(ROUTES_PATH.NewBill);
      await new Promise(process.nextTick);

      // Fill form with test data
      screen.getByTestId("expense-type").value = "Transports";
      screen.getByTestId("expense-name").value = "Train Paris-Marseille";
      screen.getByTestId("amount").value = "100";
      screen.getByTestId("datepicker").value = "2023-03-15";
      screen.getByTestId("vat").value = "20";
      screen.getByTestId("pct").value = "20";
      screen.getByTestId("commentary").value = "Voyage pro";

      // Creates file and upload to the file input of the form
      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "facture.jpg", { type: "image/jpeg" });
      await userEvent.upload(fileInput, file);

      // POST request is triggered there
      screen.getByTestId("btn-send-bill").click();
      await new Promise(process.nextTick);

      // We expect that error has been logged as error in the console
      expect(logSpy).toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenCalledWith(error);

      // Restores the initial console.error method that we've spied
      logSpy.mockRestore();

      // We expect that we didn't change view using the title of the form
      const message = await screen.getByText(/Envoyer une note de frais/);
      expect(message).toBeTruthy();

      // Restores the mocked implementation of bills create / update methods
      mockStore.bills.mockRestore();
    });

    test("Or then I post bill to API and fails with 500 message error in console", async () => {
      // Same as 404 error POST test here, but with 500 error message
      const logSpy = jest.spyOn(global.console, 'error');
      const error = new Error("Erreur 500");

      mockStore.bills.mockImplementation(() => ({
        create: () => Promise.reject(error),
        update: () => Promise.reject(error),
      }));

      window.onNavigate(ROUTES_PATH.NewBill);
      await new Promise(process.nextTick);

      // Fill form with test data
      screen.getByTestId("expense-type").value = "Transports";
      screen.getByTestId("expense-name").value = "Train Paris-Marseille";
      screen.getByTestId("amount").value = "100";
      screen.getByTestId("datepicker").value = "2023-03-15";
      screen.getByTestId("vat").value = "20";
      screen.getByTestId("pct").value = "20";
      screen.getByTestId("commentary").value = "Voyage pro";

      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "facture.jpg", { type: "image/jpeg" });
      await userEvent.upload(fileInput, file);

      screen.getByTestId("btn-send-bill").click();
      await new Promise(process.nextTick);

      expect(logSpy).toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenCalledWith(error);

      logSpy.mockRestore();

      const message = await screen.getByText(/Envoyer une note de frais/);
      expect(message).toBeTruthy();

      mockStore.bills.mockRestore();
    })
  })
})
