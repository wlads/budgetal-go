package actions

import (
	"fmt"
	"time"

	"github.com/dillonhafer/budgetal-go/backend/models"
)

func (as *ActionSuite) Test_AnnualBudgets_Index_CreatesMissingBudget() {
	SignedInUser(as)

	annualBudgetItems := &models.AnnualBudgets{}
	count, _ := as.DB.Count(annualBudgetItems)

	as.Equal(count, 0)

	as.JSON("/annual-budgets/2017").Get()
	count, _ = as.DB.Count(annualBudgetItems)
	as.Equal(count, 1)

	// Idempotent
	as.JSON("/annual-budgets/2017").Get()
	count, _ = as.DB.Count(annualBudgetItems)
	as.Equal(count, 1)
}

func (as *ActionSuite) Test_AnnualBudgets_Index_BadYear() {
	SignedInUser(as)
	response := as.JSON("/annual-budgets/abcd").Get()
	as.Equal(404, response.Code)
}

func (as *ActionSuite) Test_AnnualBudgets_Index_LowYear() {
	SignedInUser(as)
	response := as.JSON("/annual-budgets/2014").Get()
	as.Equal(404, response.Code)
}

func (as *ActionSuite) Test_AnnualBudgets_Index_HighYear() {
	SignedInUser(as)
	url := fmt.Sprintf("/annual-budgets/%d", time.Now().Local().Year()+4)

	response := as.JSON(url).Get()
	as.Equal(404, response.Code)
}

func (as *ActionSuite) Test_AnnualBudgets_Index_RequiresUser() {
	r := as.JSON("/annual-budgets/2017").Get()
	as.Equal(401, r.Code)
}
