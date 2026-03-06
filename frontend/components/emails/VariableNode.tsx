import { Node, mergeAttributes } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react"

const VARIABLE_OPTIONS = [
  { group: "Contact", variables: [
    { value: "contact.first_name", label: "Prénom" },
    { value: "contact.last_name", label: "Nom" },
    { value: "contact.email", label: "Email" },
    { value: "contact.company", label: "Entreprise" },
    { value: "contact.phone", label: "Téléphone" },
  ]},
  { group: "Deal", variables: [
    { value: "deal.name", label: "Nom du deal" },
    { value: "deal.amount", label: "Montant" },
    { value: "deal.stage", label: "Étape" },
  ]},
]

export { VARIABLE_OPTIONS }

function VariableNodeView({ node }: ReactNodeViewProps) {
  const variable = node.attrs.variable as string
  const label = VARIABLE_OPTIONS
    .flatMap((g) => g.variables)
    .find((v) => v.value === variable)?.label || variable

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className="inline-flex items-center rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-medium"
        contentEditable={false}
      >
        {`{{${label}}}`}
      </span>
    </NodeViewWrapper>
  )
}

export const TemplateVariable = Node.create({
  name: "templateVariable",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      variable: { default: "" },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, {
      "data-variable": HTMLAttributes.variable,
    }), `{{${HTMLAttributes.variable}}}`]
  },

  renderText({ node }) {
    return `{{${node.attrs.variable}}}`
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableNodeView)
  },
})
