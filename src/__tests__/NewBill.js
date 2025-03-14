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
  describe("When I am on NewBill Page", () => {
    test("Then form should appear", async () => {
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

// Integration test POST
describe("Given I am connected as an employee and I am on NewBill Page", () => {
  describe("When I POST valid bill creation form", () => {
    test("Then submit handlers should be called, and should be redirected to bills page", async () => {
      jest.spyOn(mockStore, "bills");
      document.body.innerHTML = NewBillUI();

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      };

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }));

      const newBill = new NewBill({
        document, onNavigate, store: mockStore, localStorage: window.localStorage
      });

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

      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "facture.jpg", { type: "image/jpeg" });
      await userEvent.upload(fileInput, file);

      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit);
      fireEvent.submit(form);

      expect(handleSubmit).toBeCalled();
      expect(createFile).toBeCalled();

      expect(billsCreate).toHaveBeenCalled();

      const billsPageTitle = await waitFor(() => screen.getByText("Mes notes de frais"));
      expect(billsPageTitle).toBeTruthy();
    });
  });

  describe("When API fails", () => {
    beforeEach(async () => {
      jest.spyOn(mockStore, "bills")
      Object.defineProperty(
          window,
          'localStorage',
          { value: localStorageMock }
      )
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: "a@a"
      }))

      document.body.innerHTML = NewBillUI();

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      };

      const newBill = new NewBill({
        document, onNavigate, store: mockStore, localStorage: window.localStorage
      });

      const handleSubmit = jest.spyOn(newBill, "handleSubmit");

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

      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit);
    });
  });

  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      Object.defineProperty(
          window,
          'localStorage',
          { value: localStorageMock }
      )
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: "a@a"
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
    });

    test("Then fetches bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          update: (bill) => {
            return Promise.reject(new Error("Erreur 404"))
          }
        }
      });

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

      const message = await screen.getByText(/Envoyer une note de frais/);
      expect(message).toBeTruthy();
    });

    test("Or then bills from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          update: (bill) => {
            return Promise.reject(new Error("Erreur 500"))
          }
        }
      });

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

      const message = await screen.getByText(/Envoyer une note de frais/);
      expect(message).toBeTruthy();
    })
  })
})
