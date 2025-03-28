/**
 * @jest-environment jsdom
 */

import {screen, waitFor} from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import '@testing-library/jest-dom/extend-expect';
import mockStore from "../__mocks__/store"

import router from "../app/Router.js";
import Bills from "../containers/Bills.js";
import userEvent from "@testing-library/user-event";

jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      // Assigning localStorage in Jest context with localStorageMock
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      // Put user role in mocked localStorage
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))

      // Create 'root' element for router
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()

      window.onNavigate(ROUTES_PATH.Bills)

      // We expect that window icon is present, and it has class 'active-icon'
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon).toHaveClass('active-icon')
    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      // Getting all dates
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      // Defining anti chrono sort callback
      const antiChrono = (a, b) => new Date(b.date) - new Date(a.date);
      // We expect that our manually sorted dates matches with those displayed in the page
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
  })

  describe("When I am on Bills Page and I click on eye icons", () => {
    test("Then file modal should appear", async () => {
      document.body.innerHTML = BillsUI({ data: bills });

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      };

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }));

      const billsContainer = new Bills({
        document, onNavigate, store: null, localStorage: window.localStorage
      });

      const icon = screen.getAllByTestId("icon-eye")?.[0];
      expect(icon).toBeTruthy();

      const modal = await waitFor(() => screen.getByTestId("modaleFile"));
      expect(modal).toBeTruthy();

      // We expect that when we click the eye icon, the file modal pops up
      const handleShowModal = jest.fn((e) => billsContainer.handleClickIconEye(icon));
      icon.addEventListener('click', handleShowModal);
      userEvent.click(icon);
      expect(handleShowModal).toHaveBeenCalled();
    })
  });

  // Check if Create bill button is present in Bill page and correctly redirects to new bill
  describe("When I am on Bill Page and I click on New bill button", () => {
    test("Then should redirect to new bill page", async () => {
      const html = BillsUI({ data: bills });
      document.body.innerHTML = html;

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      };

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }));
      const billsContainer = new Bills({
        document, onNavigate, store: null, localStorage: window.localStorage
      });

      // We expect that when we click the 'new bill' button, we're redirected to NewBills view
      const handleNewBill = jest.fn((e) => billsContainer.handleClickNewBill());
      const newBillButton = await waitFor(() => screen.getByTestId("btn-new-bill"));
      expect(newBillButton).toBeTruthy();
      newBillButton.addEventListener("click", handleNewBill);
      userEvent.click(newBillButton);

      const sendNewBillText = await waitFor(() => screen.getByText("Envoyer une note de frais"));
      expect(sendNewBillText).toBeTruthy();
    })
  });
})

// Integration test GET
describe("Given I am user connected as an employee", () => {
  describe("When I navigate to Bills", () => {
    test("Then fetches bills from mock API GET", async () => {
      localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }));
      const root = document.createElement("div")
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByText("Mes notes de frais"));

      const tableContent = await screen.getByTestId("tbody");
      expect(tableContent).toBeTruthy();
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
          list: () => {
            return Promise.reject(new Error("Erreur 404"))
          }
        }
      });

      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    test("Or then bills from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"))
          }
        }
      });

      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    })
  })
});
