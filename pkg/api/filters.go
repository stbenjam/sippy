package api

import (
	"fmt"
	"github.com/openshift/sippy/pkg/apis/api"
	"k8s.io/klog"
	"strconv"
	"strings"
)

type LinkOperator string

const (
	LinkOperatorAnd LinkOperator = "and"
	LinkOperatorOr  LinkOperator = "or"
)

type Filter struct {
	ID           int          `json:"id"`
	Items        []FilterItem `json:"items"`
	LinkOperator LinkOperator `json:"linkOperator"`
}

type FilterItem struct {
	Field    string `json:"columnField"`
	Operator string `json:"operatorValue"`
	Value    string `json:"value"`
}

type Filterable interface {
	GetColumnType(param string) api.ColumnType
	GetStringValue(param string) (string, error)
	GetNumericalValue(param string) (float64, error)
	GetArrayValue(param string) ([]string, error)
}

func (filters Filter) Filter(item Filterable) (bool, error) {
	matches := make([]bool, 0)

	for _, filter := range filters.Items {
		klog.V(4).Infof("Applying filter: %s %s %s", filter.Field, filter.Operator, filter.Value)

		filterType := item.GetColumnType(filter.Field)
		switch filterType {
		case api.ColumnTypeString:
			klog.V(4).Infof("Column %s is of string type", filter.Field)
			result, err := filterString(filter, item)
			if err != nil {
				klog.V(4).Infof("Could not filter string type: ", err)
				return false, err
			} else {
				matches = append(matches, result)
			}
		case api.ColumnTypeNumerical:
			klog.V(4).Infof("Column %s is of numerical type", filter.Field)
			result, err := filterNumerical(filter, item)
			if err != nil {
				klog.V(4).Infof("Could not filter numerical type: ", err)
				return false, err
			} else {
				matches = append(matches, result)
			}
		case api.ColumnTypeArray:
			klog.V(4).Infof("Column %s is of array type", filter.Field)
			result, err := filterArray(filter, item)
			if err != nil {
				klog.V(4).Infof("Could not filter array type: ", err)
				return false, err
			} else {
				matches = append(matches, result)
			}
		default:
			klog.V(4).Infof("Unknown type of field ", filter.Field)
			return false, fmt.Errorf("%s: unknown field or field type", filter.Field)
		}
	}

	if filters.LinkOperator == LinkOperatorOr {
		for _, value := range matches {
			if value {
				klog.V(4).Infof("Filter matched")
				return true, nil
			}
		}

		klog.V(4).Infof("Filter did not match")
		return false, nil
	}

	// LinkOperator as "and" is the default:
	for _, value := range matches {
		if !value {
			klog.V(4).Infof("Filter did not match")
			return false, nil
		}
	}

	klog.V(4).Infof("Filter did match")
	return true, nil
}

func filterString(filter FilterItem, item Filterable) (bool, error) {
	value, err := item.GetStringValue(filter.Field)
	if err != nil {
		return false, err
	}
	klog.V(4).Infof("Got value for %s=%s", filter.Field, value)

	comparison := filter.Value

	switch filter.Operator {
	case "contains":
		return strings.Contains(value, comparison), nil
	case "equals":
		return value == comparison, nil
	case "starts with":
		return strings.HasPrefix(value, comparison), nil
	case "ends with":
		return strings.HasSuffix(value, comparison), nil
	case "is empty":
		return value == "", nil
	case "is not empty":
		return value != "", nil
	default:
		return false, fmt.Errorf("unknown string field operator %s", filter.Operator)
	}
}

func filterNumerical(filter FilterItem, item Filterable) (bool, error) {
	if filter.Value == "" {
		return true, nil
	}

	value, err := item.GetNumericalValue(filter.Field)
	if err != nil {
		return false, err
	}

	comparison, err := strconv.ParseFloat(filter.Value, 64)
	if err != nil {
		return false, err
	}

	switch filter.Operator {
	case "=":
		return value == comparison, nil
	case "!=":
		return value != comparison, nil
	case ">":
		return value > comparison, nil
	case "<":
		return value < comparison, nil
	case ">=":
		return value >= comparison, nil
	case "<=":
		return value <= comparison, nil
	case "is empty":
		return value == 0, nil
	case "is not empty":
		return value != 0, nil
	default:
		return false, fmt.Errorf("unknown numeric field operator %s", filter.Operator)
	}
}

func filterArray(filter FilterItem, item Filterable) (bool, error) {
	list, err := item.GetArrayValue(filter.Field)
	if err != nil {
		return false, err
	}

	for _, value := range list {
		if strings.Contains(value, filter.Value) {
			return true, nil
		}
	}

	return false, nil
}
